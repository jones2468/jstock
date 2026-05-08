export interface Env {
  DB: D1Database;
  ADMIN_TOKEN?: string;
}

export type HonoEnv = { Bindings: Env };
