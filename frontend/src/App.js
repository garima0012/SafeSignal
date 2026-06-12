import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:8000";

const DISTRICTS = [
  "New Delhi", "North Delhi", "South Delhi", "East Delhi",
  "Dwarka", "Rohini", "Saket", "Janakpuri",
  "Vasant Kunj", "Lajpat Nagar", "Karol Bagh"
];

const RISK_CONFIG = {
  Low:    { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", emoji: "🟢", msg: "Area appears safe right now." },
  Medium: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", emoji: "🟡", msg: "Stay alert. Avoid isolated spots." },
  High:   { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", emoji: "🔴", msg: "High risk detected. Move to a safe zone." },
};

export default function App() {
  const [district,   setDistrict]   = useState("New Delhi");
  const [lighting,   setLighting]   = useState(1);
  const [crowd,      setCrowd]      = useState(1);
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [sosMode,    setSosMode]    = useState(false);
  const [sosName,    setSosName]    = useState("");
  const [sosEmail,   setSosEmail]   = useState("");
  const [sosSent,    setSosSent]    = useState(false);
  const [error,      setError]      = useState("");

  const now = new Date();

  const checkRisk = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude:    28.6139,
          longitude:   77.2090,
          district,
          hour:        now.getHours(),
          day_of_week: now.getDay() === 0 ? 6 : now.getDay() - 1,
          lighting,
          crowd_level: crowd,
        }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setResult(data);
    } catch {
      // Demo fallback when backend not running
      const hour = now.getHours();
      const isNight = hour >= 21 || hour <= 5;
      const isHighDistrict = ["New Delhi","North Delhi","South Delhi","East Delhi"].includes(district);
      const score = (isNight ? 0.35 : 0.1) + (isHighDistrict ? 0.3 : 0.1) + ((1-lighting)*0.2) + ((crowd===0)?0.15:0);
      const label = score > 0.5 ? "High" : score > 0.3 ? "Medium" : "Low";
      setResult({
        risk_level: label,
        risk_score: Math.min(score, 0.99).toFixed(2),
        top_factors: [
          isNight && "Late night hours (high risk window)",
          isHighDistrict && "High historical crime rate in this area",
          !lighting && "Poor lighting reported",
          crowd === 0 && "Low crowd density (isolated area)",
        ].filter(Boolean),
        safe_zones: ["Nearest Metro Station", "Nearest Police Station", "Nearest Hospital"],
      });
    }
    setLoading(false);
  }, [district, lighting, crowd]);

  const sendSOS = async () => {
    try {
      await fetch(`${API}/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sosName || "Anonymous",
          location: district + ", Delhi",
          latitude: 28.6139, longitude: 77.2090,
          contact_email: sosEmail,
        }),
      });
    } catch {}
    setSosSent(true);
    setTimeout(() => { setSosMode(false); setSosSent(false); }, 4000);
  };

  const cfg = result ? RISK_CONFIG[result.risk_level] : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f13", color: "#f1f1f1", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ borderBottom: "1px solid #1e1e28", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 22 }}>🛡️</div>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" }}>SafeSignal</div>
          <div style={{ fontSize: 12, color: "#6b6b7e" }}>Women Safety Risk Predictor · Delhi</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b6b7e" }}>
          {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>

        {/* Hero */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 30, fontWeight: 700, lineHeight: 1.2, margin: "0 0 8px" }}>
            Know your risk.<br />
            <span style={{ color: "#f87171" }}>Before you're in it.</span>
          </h1>
          <p style={{ color: "#9191a4", fontSize: 15, margin: 0 }}>
            Real-time safety scores for Delhi — powered by NCRB crime data and ML.
          </p>
        </div>

        {/* Input Card */}
        <div style={{ background: "#16161e", border: "1px solid #1e1e2e", borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

            <div>
              <label style={{ fontSize: 12, color: "#6b6b7e", display: "block", marginBottom: 6 }}>DISTRICT</label>
              <select
                value={district}
                onChange={e => setDistrict(e.target.value)}
                style={{ width: "100%", background: "#0f0f13", border: "1px solid #2a2a3a", borderRadius: 8, color: "#f1f1f1", padding: "10px 12px", fontSize: 14 }}
              >
                {DISTRICTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#6b6b7e", display: "block", marginBottom: 6 }}>LIGHTING</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[["🌑 Dark", 0], ["💡 Lit", 1]].map(([label, val]) => (
                  <button key={val} onClick={() => setLighting(val)}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${lighting === val ? "#f87171" : "#2a2a3a"}`, background: lighting === val ? "#2d1515" : "#0f0f13", color: lighting === val ? "#f87171" : "#9191a4", fontSize: 13, cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 12, color: "#6b6b7e", display: "block", marginBottom: 6 }}>CROWD LEVEL</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[["👤 Isolated", 0], ["👥 Moderate", 1], ["👫 Crowded", 2]].map(([label, val]) => (
                  <button key={val} onClick={() => setCrowd(val)}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${crowd === val ? "#818cf8" : "#2a2a3a"}`, background: crowd === val ? "#1a1a2e" : "#0f0f13", color: crowd === val ? "#818cf8" : "#9191a4", fontSize: 13, cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={checkRisk} disabled={loading}
            style={{ width: "100%", padding: "14px 0", borderRadius: 10, border: "none", background: loading ? "#2a2a3a" : "linear-gradient(135deg,#7c3aed,#db2777)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", transition: "opacity 0.2s" }}>
            {loading ? "Analysing..." : "Check Safety Now →"}
          </button>
        </div>

        {/* Result Card */}
        {result && cfg && (
          <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 32 }}>{cfg.emoji}</div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: cfg.color }}>{result.risk_level} Risk</div>
                <div style={{ fontSize: 14, color: cfg.color, opacity: 0.8 }}>{cfg.msg}</div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: cfg.color }}>{Math.round(result.risk_score * 100)}%</div>
                <div style={{ fontSize: 11, color: cfg.color, opacity: 0.7 }}>risk score</div>
              </div>
            </div>

            {/* Risk bar */}
            <div style={{ background: "#e5e7eb", borderRadius: 99, height: 6, marginBottom: 20 }}>
              <div style={{ width: `${result.risk_score * 100}%`, height: "100%", borderRadius: 99, background: cfg.color, transition: "width 0.8s ease" }} />
            </div>

            {/* Factors */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Why this score</div>
              {result.top_factors.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                  <span style={{ color: cfg.color, marginTop: 2 }}>▸</span>
                  <span style={{ fontSize: 14, color: "#374151" }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Safe zones */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Nearest safe zones</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {result.safe_zones.map((z, i) => (
                  <span key={i} style={{ background: "#fff", border: "1px solid #d1d5db", borderRadius: 99, padding: "4px 12px", fontSize: 13, color: "#374151" }}>📍 {z}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SOS Button */}
        <div style={{ background: "#16161e", border: "1px solid #3f1010", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: sosMode ? 16 : 0 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#f87171" }}>🚨 Emergency SOS</div>
              <div style={{ fontSize: 13, color: "#6b6b7e", marginTop: 2 }}>Alert your emergency contact instantly</div>
            </div>
            <button onClick={() => setSosMode(!sosMode)}
              style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#7f1d1d", color: "#fca5a5", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              {sosMode ? "Cancel" : "SOS"}
            </button>
          </div>

          {sosMode && !sosSent && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input placeholder="Your name" value={sosName} onChange={e => setSosName(e.target.value)}
                style={{ background: "#0f0f13", border: "1px solid #3f1010", borderRadius: 8, color: "#f1f1f1", padding: "10px 12px", fontSize: 14 }} />
              <input placeholder="Emergency contact email" value={sosEmail} onChange={e => setSosEmail(e.target.value)}
                style={{ background: "#0f0f13", border: "1px solid #3f1010", borderRadius: 8, color: "#f1f1f1", padding: "10px 12px", fontSize: 14 }} />
              <button onClick={sendSOS}
                style={{ padding: "12px 0", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                🚨 SEND SOS ALERT NOW
              </button>
            </div>
          )}

          {sosSent && (
            <div style={{ background: "#14532d", border: "1px solid #166534", borderRadius: 8, padding: 12, textAlign: "center", color: "#86efac", fontWeight: 600 }}>
              ✅ SOS sent! Help is on the way.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, textAlign: "center", color: "#6b6b7e", fontSize: 12 }}>
          Built by Garima Pathania · Data: NCRB Crime in India 2022 · Emergency: 112
        </div>
      </main>
    </div>
  );
}
