import express, { type ErrorRequestHandler } from "express";
import { legacyRouter } from "./api/legacyRouter.ts";
import { v4Router } from "./api/v4Router.ts";
import { logger } from "./logger.ts";
import { networkCache } from "./state/networkCache.ts";
import { vehicleCache } from "./state/vehicleCache.ts";

const reportError: ErrorRequestHandler = (err, req, res, next) => {
  logger.error({ err, method: req.method, path: req.path }, "request failed");
  res.sendStatus(typeof err?.status === "number" ? err.status : 500);
};

const app = express();

// Deployed behind a TLS-terminating reverse proxy; rate limiting needs the
// client IP from X-Forwarded-For.
app.set("trust proxy", 1);

app.use(express.json());
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
app.use("/mbus/api/v3", legacyRouter);
app.use("/mbus/api/v4", v4Router);
app.use(reportError);

vehicleCache.start();
networkCache.start();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Poll timers are unref'd, so once the server closes the process drains and
// exits on its own.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => server.close());
}
