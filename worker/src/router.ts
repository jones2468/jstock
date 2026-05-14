import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HonoEnv } from "./env";

import { etfRoutes } from "./api/etf";
import { holdingsRoutes } from "./api/holdings";
import { radarRoutes } from "./api/radar";
import { overlapRoutes } from "./api/overlap";
import { stockRoutes } from "./api/stock";
import { chartRoutes } from "./api/chart";
import { metaRoutes } from "./api/meta";
import { searchRoutes } from "./api/search";
import { adminRoutes } from "./api/admin";
import { watchlistRoutes } from "./api/watchlist";
import { marketRoutes } from "./api/market";

const app = new Hono<HonoEnv>();

app.use("/*", cors());

const api = app.basePath("/api/v1");

api.route("/etfs", etfRoutes);
api.route("/holdings", holdingsRoutes);
api.route("/radar", radarRoutes);
api.route("/overlap", overlapRoutes);
api.route("/stocks", stockRoutes);
api.route("/chart", chartRoutes);
api.route("/meta", metaRoutes);
api.route("/search", searchRoutes);
api.route("/admin", adminRoutes);
api.route("/watchlist", watchlistRoutes);
api.route("/market", marketRoutes);

app.get("/", (c) => c.json({ name: "jstock-worker", status: "ok" }));

export { app };
