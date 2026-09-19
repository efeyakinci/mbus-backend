import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  BustimeUnavailableError,
  fetchStopPredictions,
  fetchVehiclePredictions,
} from "./client.ts";

function prediction(vid: string, prdctdn = "5") {
  return { vid, rt: "BB", stpid: "S1", stpnm: "Stop", des: "There", prdctdn };
}

function fakeFetch(respond: (url: URL) => object) {
  const requests: URL[] = [];
  mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    requests.push(url);
    return Response.json(respond(url));
  });
  return { requests };
}

afterEach(() => mock.restoreAll());

for (const source of ["stop", "vehicle"] as const) {
  describe(`${source} predictions`, () => {
    const fetchPredictions = () =>
      source === "stop"
        ? fetchStopPredictions("S1", ["BB", "CN"])
        : fetchVehiclePredictions("77");

    it("filters scheduled departures before selecting the first four live predictions", async () => {
      const live = [
        { ...prediction("77", "DUE"), typ: "D", dstp: 0, dyn: 0 },
        { ...prediction("77", "DLY"), typ: "A", dly: true },
        prediction("78", "8"),
        prediction("79", "9"),
        prediction("80", "10"),
      ];
      const scheduled = { ...prediction(""), typ: "D", dyn: 0, tatripid: "7557696" };
      const all = [scheduled, scheduled, scheduled, scheduled, live[0], scheduled, ...live.slice(1)];
      const errors = [{ stpid: "S2", msg: "No service scheduled" }];
      const { requests } = fakeFetch((url) => {
        const top = url.searchParams.get("top");
        return {
          extra: "envelope kept",
          "bustime-response": {
            prd: top === null ? all : all.slice(0, Number(top)),
            error: errors,
            extra: "body kept",
          },
        };
      });

      const payload = await fetchPredictions();

      assert.deepEqual(payload, {
        extra: "envelope kept",
        "bustime-response": {
          prd: live.slice(0, 4),
          error: errors,
          extra: "body kept",
        },
      });
      assert.equal(requests.length, 1);
      const url = requests[0]!;
      assert.equal(url.searchParams.get("top"), null);
      assert.equal(url.searchParams.get("requestType"), "getpredictions");
      assert.equal(url.searchParams.get("rtpidatafeed"), "bustime");
      assert.equal(url.searchParams.get("locale"), "en");
      assert.equal(url.searchParams.get("stpid"), source === "stop" ? "S1" : null);
      assert.equal(url.searchParams.get("rt"), source === "stop" ? "BB,CN" : null);
      assert.equal(url.searchParams.get("vid"), source === "vehicle" ? "77" : null);
      assert.equal(url.searchParams.get("tmres"), source === "vehicle" ? "s" : null);
    });

    it("returns an empty prediction array when every departure is scheduled only", async () => {
      fakeFetch(() => ({
        "bustime-response": { prd: [prediction("", "DUE"), prediction("", "5")] },
      }));
      assert.deepEqual(await fetchPredictions(), {
        "bustime-response": { prd: [] },
      });
    });

    it("preserves empty and no-service payloads", async () => {
      for (const body of [{ prd: [] }, { error: [{ msg: "No service scheduled" }] }]) {
        const payload = { "bustime-response": body };
        fakeFetch(() => payload);
        assert.deepEqual(await fetchPredictions(), payload);
      }
    });

    it("still rejects malformed predictions instead of treating them as no service", async () => {
      fakeFetch(() => ({
        "bustime-response": { prd: [{ ...prediction("77"), vid: null }] },
      }));
      await assert.rejects(fetchPredictions(), BustimeUnavailableError);
    });
  });
}
