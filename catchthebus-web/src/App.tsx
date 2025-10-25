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

  // fixed stop for now: Вардар
  const stopId = "vardar";

  // --- when-to-leave inputs ---
  const [walkMin, setWalkMin] = useState<number>(() => {
    const n = Number(localStorage.getItem(LS_KEYS.walk));
    return Number.isFinite(n) && n >= 0 ? n : 7;
  });
  const [bufferMin, setBufferMin] = useState<number>(() => {
    const n = Number(localStorage.getItem(LS_KEYS.buffer));
    return Number.isFinite(n) && n >= 0 ? n : 2;
  });

  // persist prefs
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
      setStatus(
        `Updated at ${new Date(json.generatedAt ?? Date.now()).toLocaleTimeString()}`
      );
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
  }, [auto, baseUrl]);

  // --- filter arrivals to only metro lines "1" and "4" ---
  const metroOnly = (data?.arrivals ?? []).filter((a) =>
    a.line === "1" || a.line === "4"
  );

  // group by line
  const arrivalsByLine: Record<string, Arrival[]> = {
    "1": [],
    "4": [],
  };
  for (const a of metroOnly) {
    if (a.line === "1") arrivalsByLine["1"].push(a);
    else if (a.line === "4") arrivalsByLine["4"].push(a);
  }

  // helper to render a block for a specific metro line
  function LineBlock({ lineId, label }: { lineId: "1" | "4"; label: string }) {
    const arrs = arrivalsByLine[lineId];

    // find the first makeable for highlight inside this line only
    const firstMakeableIdx = arrs.findIndex(
      (x) => adviceFor(x.inMinutes).tone !== "late"
    );

    return (
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(230,240,255,0.9) 100%)",
          borderRadius: 16,
          boxShadow:
            "0 8px 24px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)",
          border: "1px solid rgba(0,0,0,0.05)",
          padding: "16px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span
              style={{
                backgroundColor: "#003A8C",
                color: "white",
                fontWeight: 600,
                borderRadius: 12,
                padding: "4px 10px",
                fontSize: "1rem",
                lineHeight: 1.2,
                minWidth: 44,
                textAlign: "center",
              }}
            >
              M{label}
            </span>
            <span
              style={{
                fontSize: "1rem",
                color: "#003A8C",
                fontWeight: 600,
              }}
            >
              Line {label}
            </span>
          </div>
        </div>

        {arrs.length === 0 ? (
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 500,
              color: "#555",
              padding: "8px 0",
            }}
          >
            No upcoming trains
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {arrs.map((a, idx) => {
              const adv = adviceFor(a.inMinutes);
              const highlight = adv.tone !== "late" && idx === firstMakeableIdx;

              return (
                <div
                  key={idx}
                  style={{
                    borderRadius: 12,
                    border: highlight
                      ? "2px solid #003A8C"
                      : "1px solid rgba(0,0,0,0.1)",
                    backgroundColor: highlight ? "#eaf2ff" : "white",
                    padding: "12px 14px",
                    display: "grid",
                    rowGap: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {a.direction ?? ""}
                    </div>
                    <div
                      style={{ fontSize: "0.8rem", color: "#666", fontWeight: 500 }}
                    >
                      arrives in {a.inMinutes} min
                    </div>
                  </div>

                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "1rem",
                      color:
                        adv.tone === "late"
                          ? "#b00020"
                          : adv.tone === "now"
                          ? "#d97706"
                          : "#003A8C",
                    }}
                  >
                    {adv.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <main
      style={{
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
        padding: 16,
        maxWidth: 820,
        margin: "0 auto",
        display: "grid",
        gap: 16,
      }}
    >
      {/* Metro-style header */}
      <header
        style={{
          backgroundColor: "#003A8C",
          color: "white",
          borderRadius: 16,
          padding: "16px 20px",
          boxShadow:
            "0 12px 32px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "1.1rem",
                lineHeight: 1.2,
              }}
            >
              {data?.stopName
                ? `${data.stopName} — Metro Arrivals`
                : "Metro Arrivals"}
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.8)",
                fontWeight: 400,
              }}
            >
              {status}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
              color: "white",
              fontSize: "0.8rem",
              fontWeight: 500,
            }}
          >
            <code
              style={{
                backgroundColor: "rgba(0,0,0,0.3)",
                borderRadius: 8,
                padding: "2px 6px",
                fontSize: "0.7rem",
                lineHeight: 1.2,
              }}
            >
              {baseUrl}
            </code>
            <button
              onClick={load}
              style={{
                backgroundColor: "white",
                color: "#003A8C",
                border: "0",
                borderRadius: 8,
                padding: "4px 8px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
            <label style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
                style={{ marginRight: 4 }}
              />
              Auto (15s)
            </label>
          </div>
        </div>

        {/* Walk / Buffer controls */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            marginTop: 16,
            fontSize: "0.8rem",
            fontWeight: 500,
          }}
        >
          <label style={{ display: "grid", gap: 4, color: "white" }}>
            <span>Walk to station (min)</span>
            <input
              type="number"
              min={0}
              value={walkMin}
              onChange={(e) =>
                setWalkMin(Math.max(0, Number(e.target.value)))
              }
              style={{
                width: 64,
                padding: "4px 6px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.4)",
                backgroundColor: "rgba(255,255,255,0.15)",
                color: "white",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 4, color: "white" }}>
            <span>Extra safety (min)</span>
            <input
              type="number"
              min={0}
              value={bufferMin}
              onChange={(e) =>
                setBufferMin(Math.max(0, Number(e.target.value)))
              }
              style={{
                width: 64,
                padding: "4px 6px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.4)",
                backgroundColor: "rgba(255,255,255,0.15)",
                color: "white",
              }}
            />
          </label>
        </div>
      </header>

      {/* Metro lines section */}
      <section
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        <LineBlock lineId="1" label="1" />
        <LineBlock lineId="4" label="4" />
      </section>

      {/* error block, if any */}
      {data?.error && (
        <div
          style={{
            border: "1px solid #f99",
            background: "#fff4f4",
            padding: 12,
            borderRadius: 10,
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          {data.error}
        </div>
      )}
    </main>
  );
}
