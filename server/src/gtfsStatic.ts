// server/src/gtfsStatic.ts
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
type StopRow = { stop_id: string; stop_name: string };
type RouteRow = { route_id: string; route_short_name?: string; route_long_name?: string };


const STATIC_URL = "https://gtfs.sofiatraffic.bg/api/v1/static";

export type StopsById = Map<string, { stop_id: string; stop_name: string }>;
export type RoutesById = Map<string, { route_id: string; route_short_name: string; route_long_name: string }>;

export async function loadStatic(): Promise<{ stopsById: StopsById; routesById: RoutesById; vardarStopIds: Set<string> }> {
  // 1) download ZIP into memory
  const res = await fetch(STATIC_URL);
  if (!res.ok) throw new Error(`GTFS static HTTP ${res.status}`);
  const ab = await res.arrayBuffer();
  const zip = new AdmZip(Buffer.from(ab));

  // 2) read files we need
  const stopsTxt = zip.readAsText("stops.txt");
  const routesTxt = zip.readAsText("routes.txt");

  // 3) parse CSVs
    const stops = parse<StopRow>(stopsTxt, { columns: true, skip_empty_lines: true });
    const routes = parse<RouteRow>(routesTxt, { columns: true, skip_empty_lines: true });


  const stopsById: StopsById = new Map();
  for (const row of stops) {
    // normalize name spacing/case a bit
    const stop_id = String(row.stop_id);
    const stop_name = String(row.stop_name || "").trim();
    stopsById.set(stop_id, { stop_id, stop_name });
  }

  const routesById: RoutesById = new Map();
  for (const row of routes) {
    const route_id = String(row.route_id);
    const route_short_name = String(row.route_short_name || "").trim();
    const route_long_name  = String(row.route_long_name  || "").trim();
    routesById.set(route_id, { route_id, route_short_name, route_long_name });
  }

  // 4) find all stops named “Вардар” (sometimes datasets include platform variants)
  const vardarStopIds = new Set<string>();
  for (const { stop_id, stop_name } of stopsById.values()) {
    const n = stop_name.toLowerCase();
    if (n.includes("вардар")) {
      vardarStopIds.add(stop_id);
    }
  }

  if (vardarStopIds.size === 0) {
    console.warn("⚠️ Could not find ВАРДАР in stops.txt — double-check dataset.");
  } else {
    console.log("✅ Vardar stop_ids:", Array.from(vardarStopIds).join(", "));
  }

  return { stopsById, routesById, vardarStopIds };
}
