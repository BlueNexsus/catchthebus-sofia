import { useEffect, useMemo, useState } from "react";
import "./App.css";

type Arrival = { line: string; direction?: string; inMinutes: number };
type ApiResponse = {
  stopName: string;
  lines: string[];
  arrivals: Arrival[];
  generatedAt: string;
  error?: string;
};

const LS_KEYS = {
  stopId: "ctl.stopId",
  walk: "ctl.walkMin",
  buffer: "ctl.bufferMin",
};

export default function App() {
  const baseUrl = useMemo(
    () =>
      (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ||
      "http://localhost:4000",
    []
  );

  // --- dynamic stop selection (defaults to vardar) ---
  const [stopId, setStopId] = useState<string>(() => {
    return localStorage.getItem(LS_KEYS.stopId) || "vardar";
  });

  // for now we only have the Vardar endpoint on the backend; leave hooks for more
  const knownStops: { id: string; label: string }[] = [
    { id: "vardar", label: "Вардар (vardar)" },
    // later: { id: "serdika", label: "Сердика (serdika)" }, etc.
  ];

  // --- PoC “when to leave” inputs ---
  const [walkMin, setWalkMin] = useState<number>(() => {
    const n = Number(localStorage.getItem(LS_KEYS.walk));
    return Number.isFinite(n) && n >= 0 ? n : 7;
  });
  const [bufferMin, setBufferMin] = useState<number>(() => {
    const n = Number(localStorage.getItem(LS_KEYS.buffer));
    return Number.isFinite(n) && n >= 0 ? n : 2;
  });

  // persist small prefs
  useEffect(() => {
    localStorage.setItem(LS_KEYS.stopId, stopId);
  }, [stopId]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.walk, String(walkMin));
  }, [walkMin]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.buffer, String(bufferMin));
  }, [bufferMin]);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [status, setStatus] = useState("Idle");
  const [auto, setAuto] = useState(true);

  function adviceFor(inMinutes: number) {
    const leaveIn = inMinutes - (walkMin + bufferMin);
    if (leaveIn < 0) return { label: "too late", leaveIn, tone: "late" as const };
    if (leaveIn === 0) return { label: "go now", leaveIn, tone: "now" as const };
    return { label: `leave in ${leaveIn} min`, leaveIn, tone: "ok" as const };
  }

  async function load() {
    const url = `${baseUrl}/arrivals/${encodeURIComponent(stopId)}`;
    setStatus(`Loading ${url} …`);
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ApiResponse;
      setData(json);
      setStatus(`Updated at ${new Date(json.generatedAt ?? Date.now()).toLocaleTimeString()}`);
    } catch (e: any) {
      setStatus(`Error: ${e?.message ?? String(e)}`);
      setData(null);
    }
  }

  useEffect(() => {
    load();
    let t: number | undefined;
    if (auto) t = window.setInterval(load, 15000);
    return () => {
      if (t) clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, baseUrl, stopId]);

  // find first arrival that is not “late” to highlight it
  const firstMakeableIdx =
    data?.arrivals?.findIndex((x) => adviceFor(x.inMinutes).tone !== "late") ?? -1;

  return (
    <main style={{ fontFamily: "system-ui", padding: 16, maxWidth: 820, margin: "0 auto" }}>
      <header style={{ display: "grid", gap: 8, justifyItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <code>{baseUrl}</code>
          <button onClick={load}>Refresh</button>
          <label>
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
            />{" "}
            Auto-refresh (15 s)
          </label>
        </div>

        <h1 style={{ margin: 0 }}>
          {data?.stopName ? `${data.stopName} — Live Arrivals` : "Live Arrivals"}
        </h1>

        <div style={{ color: "#666" }}>{status}</div>

        {/* stop selector (dropdown + manual override) */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 4,
          }}
        >
          <label>
            Stop:&nbsp;
            <select
              value={stopId}
              onChange={(e) => setStopId(e.target.value)}
              style={{ padding: "4px 8px" }}
            >
              {knownStops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <span style={{ color: "#888" }}>or</span>

          <label>
            Custom stopId:&nbsp;
            <input
              value={stopId}
              onChange={(e) => setStopId(e.target.value.trim())}
              placeholder="e.g. vardar"
              style={{ padding: "4px 8px", width: 180 }}
            />
          </label>

          {/* when-to-leave inputs */}
          <label>
            Walk (min):&nbsp;
            <input
              type="number"
              min={0}
              value={walkMin}
              onChange={(e) => setWalkMin(Math.max(0, Number(e.target.value)))}
              style={{ width: 64, padding: "4px 6px" }}
            />
          </label>

          <label>
            Buffer (min):&nbsp;
            <input
              type="number"
              min={0}
              value={bufferMin}
              onChange={(e) => setBufferMin(Math.max(0, Number(e.target.value)))}
              style={{ width: 64, padding: "4px 6px" }}
            />
          </label>
        </div>
      </header>

      <section style={{ marginTop: 12 }}>
        <div>
          <strong>Lines:</strong> {data?.lines?.length ? data.lines.join(", ") : "–"}
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {(data?.arrivals ?? []).length ? (
            data!.arrivals.map((a, i) => {
              const adv = adviceFor(a.inMinutes);
              const highlight = adv.tone !== "late" && i === firstMakeableIdx;
              return (
                <div
                  key={i}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: 12,
                    padding: 12,
                    background: highlight ? "#eef7ff" : "white",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          border: "1px solid #ccc",
                          borderRadius: 8,
                          padding: "2px 8px",
                          marginRight: 6,
                        }}
                      >
                        Line {a.line || "?"}
                      </span>
                      <span>{a.direction ?? ""}</span>
                    </div>
                    <div style={{ color: "#666" }}>arrives in {a.inMinutes} min</div>
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 600 }}>
                    {adv.label}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
              No upcoming arrivals.
            </div>
          )}
        </div>

        {data?.error && (
          <div
            style={{
              border: "1px solid #f99",
              background: "#fff4f4",
              padding: 12,
              borderRadius: 10,
              marginTop: 8,
            }}
          >
            {data.error}
          </div>
        )}
      </section>
    </main>
  );
}
