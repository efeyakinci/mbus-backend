import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { it } from "node:test";
import express from "express";
import { legacyRouter } from "./legacyRouter.ts";
import { v4Router } from "./v4Router.ts";

it("serves only vehicle-backed predictions through all four arrival endpoints", async (t) => {
  const request = globalThis.fetch;
  const live = {
    vid: "77", rt: "BB", stpid: "C250", stpnm: "CCTC",
    des: "Bursley", prdctdn: "DUE", typ: "D", dstp: 0,
  };
  const scheduled = { ...live, vid: "" };
  let predictions = [scheduled, live];
  t.mock.method(globalThis, "fetch", async () => Response.json({
    "bustime-response": { prd: predictions },
  }));

  const app = express();
  app.use("/mbus/api/v3", legacyRouter);
  app.use("/mbus/api/v4", v4Router);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    for (const scheduledOnly of [false, true]) {
      predictions = scheduledOnly ? [scheduled] : [scheduled, live];
      for (const endpoint of ["getStopPredictions/C250", "getBusPredictions/77"]) {
        const response = await request(`${base}/mbus/api/v3/${endpoint}`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
          "bustime-response": { prd: scheduledOnly ? [] : [live] },
        });
      }
      for (const endpoint of ["stops/C250", "vehicles/77"]) {
        const response = await request(`${base}/mbus/api/v4/${endpoint}/arrivals`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
          arrivals: scheduledOnly ? [] : [{
            vehicleId: "77", routeId: "BB", stopId: "C250", stopName: "CCTC",
            destination: "Bursley", etaMinutes: 0,
          }],
        });
      }
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
