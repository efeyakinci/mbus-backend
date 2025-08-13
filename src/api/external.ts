import axios from "axios";

export interface ExternalError {
  message: string;
  code?: string;
  status?: number;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: ExternalError };

interface ExternalContext {
  op: string;
  detail?: Record<string, unknown>;
}

export async function runExternal<T>(op: () => Promise<T>, context: ExternalContext): Promise<Result<T>> {
  try {
    const value = await op();
    return { ok: true, value };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const code = err.code;
      const status = err.response?.status;
      console.error(`[External] ${context.op} failed`, { code, status, message: err.message, ...context.detail });
      return { ok: false, error: { message: err.message, code, status } };
    }
    const message = (err as Error)?.message ?? String(err);
    console.error(`[External] ${context.op} failed`, { message, ...context.detail });
    return { ok: false, error: { message } };
  }
}


