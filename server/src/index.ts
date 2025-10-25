import express from "express";
import cors from "cors";
import { transit_realtime as gtfs } from "gtfs-realtime-bindings";
import { loadStatic, type RoutesById } from "./gtfsStatic";

const app = express();
let routesById: RoutesById = new Map();
let vardarStopIds = new Set<string>();

(async () => {
  try {
    const s = await loadStatic();
    routesById = s.routesById;
    vardarStopIds = s.vardarStopIds;
    console.log("✅ GTFS static loaded. Vardar stop_ids:", Array.from(vardarStopIds).join(", ") || "(none)");
  } catch (e) {
    console.error("❌ Failed to load GTFS static:", e);
  }
})();

app.use(cors());
app.get("/debug/vardar-stops", (_req, res) => {
  res.json({
    count: vardarStopIds.size,
    stopIds: Array.from(vardarStopIds),
  });
});

// helper to fetch protobuf as Buffer  ✅ keep only this one
async function fetchProto(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

// REAL arrivals for Vardar (uses live trip-updates)
app.get("/arrivals/vardar", async (_req, res) => {
  try {
    if (vardarStopIds.size === 0) {
      return res.status(503).json({ error: "Vardar stop_ids not available (static not loaded)" });
    }

    const buf = await fetchProto("https://gtfs.sofiatraffic.bg/api/v1/trip-updates");
    const feed = gtfs.FeedMessage.decode(buf);

    const now = Math.floor(Date.now() / 1000);

    type Arrival = { line: string; direction?: string; inMinutes: number };
    const results: Arrival[] = [];

    for (const ent of feed.entity) {
      const tu = ent.tripUpdate;
      if (!tu) continue;

      // map routeId -> M1/M4 if available
      const routeId = tu.trip?.routeId ?? "";
      const line = routesById.get(routeId)?.route_short_name || routeId || "?";

      for (const stu of tu.stopTimeUpdate ?? []) {
        const sid = stu.stopId || "";
        if (!vardarStopIds.has(sid)) continue;

        // prefer arrival time; fallback to departure
        const getTime = (x?: { time?: any } | null): number | undefined => {
          if (!x) return undefined;
          const t = (x.time as any);
          if (typeof t === "number") return t;
          if (typeof t?.toNumber === "function") return t.toNumber();
          return undefined;
        };

        const arrT = getTime(stu.arrival ?? null);
        const depT = getTime(stu.departure ?? null);
        const t = arrT ?? depT;
        if (!t) continue;

        const deltaSec = Number(t) - now;
        if (deltaSec < 0) continue; // already passed

        const inMinutes = Math.max(0, Math.round(deltaSec / 60));

        // optional headsign available at the stop-time level in GTFS-RT
        const direction =
            (stu as any)?.stopHeadsign ??
            (tu.trip as any)?.tripHeadsign ??
            undefined;

        results.push({ line, direction, inMinutes });
      }
    }

    // soonest first
    results.sort((a, b) => a.inMinutes - b.inMinutes);

    res.json({
      stopName: "Вардар",
      lines: Array.from(new Set(results.map(r => r.line))).filter(Boolean),
      arrivals: results.slice(0, 8), // cap list
      generatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// GET /debug/vehicle-positions -> just return count
app.get("/debug/vehicle-positions", async (_req, res) => {
  try {
    const buf = await fetchProto("https://gtfs.sofiatraffic.bg/api/v1/vehicle-positions");
    const feed = gtfs.FeedMessage.decode(buf);
    res.json({
      entities: feed.entity.length
    });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

// GET /debug/trip-updates -> just return count
app.get("/debug/trip-updates", async (_req, res) => {
  try {
    const buf = await fetchProto("https://gtfs.sofiatraffic.bg/api/v1/trip-updates");
    const feed = gtfs.FeedMessage.decode(buf);
    res.json({
      entities: feed.entity.length
    });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`server listening on http://localhost:${PORT}`));
