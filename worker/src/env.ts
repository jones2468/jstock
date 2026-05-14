export interface Env {
  DB: D1Database;
  ADMIN_TOKEN?: string;
  FRED_API_KEY?: string;
}

export type HonoEnv = { Bindings: Env };
