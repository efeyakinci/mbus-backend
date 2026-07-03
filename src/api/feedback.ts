import type { Request, RequestHandler, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { appendFeedback } from "../state/feedbackStore.ts";

const MAX_FEEDBACK_LENGTH = 5000;

export const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export function feedbackHandler(bodyField: string): RequestHandler {
  return async (req: Request, res: Response) => {
    const feedback = req.body?.[bodyField];
    if (typeof feedback !== "string" || feedback.trim().length === 0) {
      res.sendStatus(400);
      return;
    }
    try {
      await appendFeedback(feedback.slice(0, MAX_FEEDBACK_LENGTH));
    } catch {
      res.sendStatus(500);
      return;
    }
    res.sendStatus(200);
  };
}
