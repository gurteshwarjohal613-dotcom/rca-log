import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://oowtwcmfczhmunbsamjt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vd3R3Y21mY3pobXVuYnNhbWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NzMxMDUsImV4cCI6MjA5NDM0OTEwNX0.Y56mkz7wV6q1U0DqE8FhoBYCD_n1W0GNnwuXohLLol4";

const SESSION_KEY = "rca_sb_session";
const saveSession = (data) => { const str = JSON.stringify(data); try { localStorage.setItem(SESSION_KEY, str); } catch(e) {} try { sessionStorage.setItem(SESSION_KEY, str); } catch(e) {} };
const loadSession = () => { try { const s = localStorage.getItem(SESSION_KEY); if (s) return JSON.parse(s); } catch(e) {} try { const s = sessionStorage.getItem(SESSION_KEY); if (s) return JSON.parse(s); } catch(e) {} return null; };
const clearSession = () => { try { localStorage.removeItem(SESSION_KEY); } catch(e) {} try { sessionStorage.removeItem(SESSION_KEY); } catch(e) {} };

const supabase = {
  _headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
  auth: {
    _session: null,
    async signUp(email, password) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (data.access_token) { this._session = data; saveSession(data); }
      return { data, error: data.error || null };
    },
    async signIn(email, password) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (data.access_token) { this._session = data; saveSession(data); }
      return { data, error: data.error_description || data.error || null };
    },
    async refreshSession() {
      const session = this.getSession();
      if (!session?.refresh_token) return null;
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY }, body: JSON.stringify({ refresh_token: session.refresh_token }) });
        const data = await res.json();
        if (data.access_token) { this._session = data; saveSession(data); return data; }
      } catch(e) {}
      return null;
    },
    async signOut() {
      const session = this.getSession();
      if (session) { try { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${session.access_token}` } }); } catch(e) {} }
      this._session = null; clearSession();
    },
    getSession() {
      if (this._session) return this._session;
      const stored = loadSession();
      if (stored) { this._session = stored; return this._session; }
      return null;
    },
  },
  async from(table) {
    const session = supabase.auth.getSession();
    const authHeader = session ? `Bearer ${session.access_token}` : `Bearer ${SUPABASE_ANON_KEY}`;
    return {
      async select(filter = "") {
        const url = `${SUPABASE_URL}/rest/v1/${table}${filter ? "?" + filter : ""}`;
        const res = await fetch(url, { headers: { ...supabase._headers, "Authorization": authHeader } });
        const data = await res.json();
        return { data, error: res.ok ? null : data };
      },
      async upsert(body) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...supabase._headers, "Authorization": authHeader, "Prefer": "resolution=merge-duplicates" }, body: JSON.stringify(body) });
        const text = await res.text();
        return { error: res.ok ? null : text };
      },
      async delete(filter = "") {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, { method: "DELETE", headers: { ...supabase._headers, "Authorization": authHeader } });
        return { error: res.ok ? null : await res.text() };
      },
    };
  },
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const INSTRUMENTS = ["NQ", "ES", "CL", "GC", "Other"];
const DIRECTIONS = ["Long", "Short"];
const LOCATIONS = ["LVN", "VAH", "VAL", "POC", "IB High", "IB Low", "VWAP Band", "HVN", "Other"];
const DISTRIBUTIONS = ["Normal", "P-Shape", "B-Shape", "Double Distribution", "Trending/Elongated", "Unclear"];
const PHASES = ["Balance", "Imbalance", "Unclear"];
const SETUP_TYPES = ["Absorption", "Rejection", "Aggression", "Continuation"];
const TRADE_TYPES = ["Fade", "Breakout", "Continuation", "Retest"];
const EXIT_TYPES = ["SL Hit", "BE Exit", "TP Hit", "Manual Exit"];
const TP_TYPES = ["OCO Default (1:2)", "Discretionary Adjusted", "Trailing Stop"];
const BE_REASONS = ["Fear", "Legitimate Read", "Premature", "Noise / No Reason"];
const ERROR_CLASSES = ["Valid Loss", "Model Error", "Execution Error", "Read Error", "Regime Misread", "Confirmation Stacking"];
const EXEC_QUALITY = ["Clean", "Late", "Early", "Sized Wrong", "Hesitated", "Confirmation Stacked"];

// PBD/LAT Entry Criteria — exact 8-point checklist
const ENTRY_CRITERIA = [
  "Outside First 15 Min",
  "Price at Pre-Marked Location",
  "Bias Defined (Balance/Imbalance)",
  "Acceptance or Rejection Observable",
  "CVD Delta > 10%",
  "Big Trade Present",
  "Absorption Confirmed",
  "Direction Aligns with Session Bias",
];

const defaultTrade = () => ({
  id: `t_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  time: "", instrument: "NQ", direction: "Long",
  // Location & Context
  location: "", distributionPrior: "", distributionCurrent: "", phase: "",
  // Setup
  setupType: "", tradeType: "",
  // Entry
  entryCriteria: {},
  // Execution
  executionQuality: "",
  // Exit
  exitType: "", tpType: "", beReason: "", plannedRR: "2", actualRR: "",
  exitReason: "",
  // Error
  errorClass: "", confirmationStacking: false,
  // RCA
  correctiveAction: "", correctiveRuleGenerated: "",
  // Pattern
  patternId: "",
  notes: "",
});

const defaultDay = () => ({
  id: `d_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  date: new Date().toISOString().split("T")[0],
  sessionBias: "",
  sessionNotes: "",
  trades: [defaultTrade()],
});

const defaultPattern = () => ({
  id: `p_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  name: "New Pattern",
  description: "",
});

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#09090b", bg2: "#111113", bg3: "#18181b", border: "#27272a", border2: "#3f3f46",
  text: "#e4e4e7", textMuted: "#71717a", textDim: "#52525b",
  green: "#6ee7b7", greenBg: "rgba(6,78,59,0.4)", greenBorder: "#059669",
  red: "#fca5a5", redBg: "rgba(127,29,29,0.4)", redBorder: "#dc2626",
  yellow: "#fcd34d", yellowBg: "rgba(113,63,18,0.4)", yellowBorder: "#d97706",
  blue: "#93c5fd", blueBg: "rgba(30,58,138,0.4)", blueBorder: "#2563eb",
  purple: "#c4b5fd", purpleBg: "rgba(109,40,217,0.3)", purpleBorder: "#7c3aed",
};
const font = "'IBM Plex Mono', 'Courier New', monospace";

const chipStyle = (active, color) => {
  const map = { green: [C.greenBg, C.greenBorder, C.green], red: [C.redBg, C.redBorder, C.red], yellow: [C.yellowBg, C.yellowBorder, C.yellow], blue: [C.blueBg, C.blueBorder, C.blue], purple: [C.purpleBg, C.purpleBorder, C.purple] };
  const [bg, border, text] = active ? (map[color] || ["#27272a", C.border2, C.text]) : ["#18181b", C.border, C.textMuted];
  return { fontSize: 11, padding: "6px 10px", borderRadius: 4, border: `1px solid ${border}`, background: bg, color: text, cursor: "pointer", fontFamily: font };
};

const badgeStyle = (color) => {
  const map = { green: [C.greenBg, C.greenBorder, C.green], red: [C.redBg, C.redBorder, C.red], yellow: [C.yellowBg, C.yellowBorder, C.yellow], blue: [C.blueBg, C.blueBorder, C.blue], gray: ["#27272a", C.border2, C.textMuted], purple: [C.purpleBg, C.purpleBorder, C.purple] };
  const [bg, border, text] = map[color] || map.gray;
  return { fontSize: 10, padding: "2px 6px", borderRadius: 4, border: `1px solid ${border}`, background: bg, color: text, fontFamily: font, letterSpacing: "0.05em" };
};

const inputStyle = { width: "100%", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", color: C.text, fontSize: 13, fontFamily: font, outline: "none", boxSizing: "border-box" };
const labelStyle = { display: "block", fontSize: 10, color: C.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" };
const sectionLabel = { fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 };

const exitColor = (t) => ({ "TP Hit": "green", "SL Hit": "red", "BE Exit": "yellow", "Manual Exit": "gray" }[t] || "gray");
const errorColor = (c) => ({ "Valid Loss": "green", "Model Error": "red", "Regime Misread": "red", "Execution Error": "yellow", "Read Error": "blue", "Confirmation Stacking": "purple" }[c] || "gray");

// ─── CHECKBOX ─────────────────────────────────────────────────────────────────
function Checkbox({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: checked ? C.green : C.textMuted, padding: "4px 0" }}>
      <div onClick={onChange} style={{ width: 16, height: 16, border: `1px solid ${checked ? C.greenBorder : C.border2}`, borderRadius: 3, background: checked ? C.greenBg : C.bg3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
        {checked && <span style={{ color: C.green, fontSize: 10, lineHeight: 1 }}>✓</span>}
      </div>
      {label}
    </label>
  );
}

// ─── TRADE CARD ───────────────────────────────────────────────────────────────
function TradeCard({ trade, onUpdate, onDelete, index, patterns }) {
  const [open, setOpen] = useState(true);
  const update = (f, v) => onUpdate({ ...trade, [f]: v });
  const toggleCriteria = (c) => onUpdate({ ...trade, entryCriteria: { ...trade.entryCriteria, [c]: !trade.entryCriteria[c] } });
  const metCount = ENTRY_CRITERIA.filter((c) => trade.entryCriteria[c]).length;
  const allMet = metCount === ENTRY_CRITERIA.length;

  return (
    <div style={{ border: `1px solid ${trade.confirmationStacking ? C.purpleBorder : C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 12, background: C.bg2 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: C.bg3, cursor: "pointer", flexWrap: "wrap", gap: 8 }} onClick={() => setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ color: C.textDim, fontSize: 11 }}>#{String(index + 1).padStart(2, "0")}</span>
          <span style={{ color: C.text, fontSize: 13 }}>{trade.time || "??:??"}</span>
          <span style={{ color: trade.direction === "Long" ? C.green : C.red, fontSize: 11, fontWeight: "bold" }}>{trade.direction}</span>
          <span style={{ color: C.textMuted, fontSize: 11 }}>{trade.instrument}</span>
          {trade.location && <span style={badgeStyle("blue")}>{trade.location}</span>}
          {trade.setupType && <span style={badgeStyle("purple")}>{trade.setupType}</span>}
          {trade.exitType && <span style={badgeStyle(exitColor(trade.exitType))}>{trade.exitType}</span>}
          {trade.actualRR && <span style={badgeStyle(parseFloat(trade.actualRR) > 0 ? "green" : "red")}>{trade.actualRR}R</span>}
          {trade.errorClass && <span style={badgeStyle(errorColor(trade.errorClass))}>{trade.errorClass}</span>}
          {trade.confirmationStacking && <span style={badgeStyle("purple")}>C.Stack</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: allMet ? C.greenBorder : C.textDim, fontSize: 11 }}>{metCount}/{ENTRY_CRITERIA.length}</span>
          <button onClick={(e) => { e.stopPropagation(); onDelete(trade.id); }} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 12 }}>✕</button>
          <span style={{ color: C.textDim, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── BASIC INFO ── */}
          <div>
            <div style={sectionLabel}>Basic Info</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
              <div><label style={labelStyle}>Time</label><input type="time" value={trade.time} onChange={(e) => update("time", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Instrument</label><select value={trade.instrument} onChange={(e) => update("instrument", e.target.value)} style={inputStyle}>{INSTRUMENTS.map((i) => <option key={i}>{i}</option>)}</select></div>
              <div>
                <label style={labelStyle}>Direction</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {DIRECTIONS.map((d) => <button key={d} onClick={() => update("direction", d)} style={{ ...chipStyle(trade.direction === d, d === "Long" ? "green" : "red"), flex: 1 }}>{d}</button>)}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Pattern</label>
                <select value={trade.patternId} onChange={(e) => update("patternId", e.target.value)} style={inputStyle}>
                  <option value="">None</option>
                  {patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── MARKET CONTEXT ── */}
          <div>
            <div style={sectionLabel}>Market Context</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div>
                <label style={labelStyle}>Phase</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {PHASES.map((p) => <button key={p} onClick={() => update("phase", trade.phase === p ? "" : p)} style={chipStyle(trade.phase === p, p === "Imbalance" ? "yellow" : p === "Balance" ? "blue" : "gray")}>{p}</button>)}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Entry Location</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {LOCATIONS.map((l) => <button key={l} onClick={() => update("location", trade.location === l ? "" : l)} style={chipStyle(trade.location === l, "blue")}>{l}</button>)}
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelStyle}>Prior Distribution</label>
                <select value={trade.distributionPrior} onChange={(e) => update("distributionPrior", e.target.value)} style={inputStyle}>
                  <option value="">Select...</option>
                  {DISTRIBUTIONS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Current Distribution</label>
                <select value={trade.distributionCurrent} onChange={(e) => update("distributionCurrent", e.target.value)} style={inputStyle}>
                  <option value="">Select...</option>
                  {DISTRIBUTIONS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── SETUP ── */}
          <div>
            <div style={sectionLabel}>Setup Classification</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Setup Type</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SETUP_TYPES.map((s) => <button key={s} onClick={() => update("setupType", trade.setupType === s ? "" : s)} style={chipStyle(trade.setupType === s, "purple")}>{s}</button>)}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Trade Type</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {TRADE_TYPES.map((t) => <button key={t} onClick={() => update("tradeType", trade.tradeType === t ? "" : t)} style={chipStyle(trade.tradeType === t, "blue")}>{t}</button>)}
                </div>
              </div>
            </div>
          </div>

          {/* ── ENTRY CRITERIA ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ ...sectionLabel, marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>Entry Criteria Checklist</div>
              <span style={{ fontSize: 10, color: allMet ? C.green : C.yellow }}>{metCount}/{ENTRY_CRITERIA.length} {allMet ? "✓ All Met" : "criteria met"}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {ENTRY_CRITERIA.map((c) => (
                <Checkbox key={c} checked={!!trade.entryCriteria[c]} onChange={() => toggleCriteria(c)} label={c} />
              ))}
            </div>
          </div>

          {/* ── EXECUTION ── */}
          <div>
            <div style={sectionLabel}>Execution</div>
            <label style={labelStyle}>Execution Quality</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {EXEC_QUALITY.map((q) => <button key={q} onClick={() => update("executionQuality", trade.executionQuality === q ? "" : q)} style={chipStyle(trade.executionQuality === q, q === "Confirmation Stacked" ? "purple" : "blue")}>{q}</button>)}
            </div>
            <div style={{ marginTop: 10 }}>
              <Checkbox checked={!!trade.confirmationStacking} onChange={() => update("confirmationStacking", !trade.confirmationStacking)} label="Confirmation Stacking Flag — waited for too many confirmations before entry" />
            </div>
          </div>

          {/* ── EXIT ── */}
          <div>
            <div style={sectionLabel}>Exit</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Planned RR (1:X)</label>
                <input type="number" value={trade.plannedRR} onChange={(e) => update("plannedRR", e.target.value)} placeholder="2" style={inputStyle} min="0" step="0.5" />
              </div>
              <div>
                <label style={labelStyle}>Actual RR Realized (1:X, negative = loss)</label>
                <input type="number" value={trade.actualRR} onChange={(e) => update("actualRR", e.target.value)} placeholder="e.g. 2 or -1" style={inputStyle} step="0.1" />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>Exit Type</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EXIT_TYPES.map((e) => <button key={e} onClick={() => update("exitType", trade.exitType === e ? "" : e)} style={chipStyle(trade.exitType === e, exitColor(e))}>{e}</button>)}
              </div>
            </div>
            {trade.exitType === "TP Hit" && (
              <div style={{ marginTop: 10 }}>
                <label style={labelStyle}>TP Method</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {TP_TYPES.map((t) => <button key={t} onClick={() => update("tpType", trade.tpType === t ? "" : t)} style={chipStyle(trade.tpType === t, "green")}>{t}</button>)}
                </div>
              </div>
            )}
            {trade.exitType === "BE Exit" && (
              <div style={{ marginTop: 10 }}>
                <label style={labelStyle}>BE Exit Reason</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {BE_REASONS.map((r) => <button key={r} onClick={() => update("beReason", trade.beReason === r ? "" : r)} style={chipStyle(trade.beReason === r, r === "Fear" || r === "Premature" || r === "Noise / No Reason" ? "red" : "green")}>{r}</button>)}
                </div>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>Exit Trigger / What Happened</label>
              <textarea value={trade.exitReason} onChange={(e) => update("exitReason", e.target.value)} rows={2} placeholder="e.g. Opposite side absorbed at HOD, flow reversed..." style={{ ...inputStyle, resize: "none" }} />
            </div>
          </div>

          {/* ── ERROR & RCA ── */}
          <div>
            <div style={sectionLabel}>Error Classification & RCA</div>
            <label style={labelStyle}>Error Class</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {ERROR_CLASSES.map((e) => <button key={e} onClick={() => update("errorClass", trade.errorClass === e ? "" : e)} style={chipStyle(trade.errorClass === e, errorColor(e))}>{e}</button>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Corrective Action</label>
                <textarea value={trade.correctiveAction} onChange={(e) => update("correctiveAction", e.target.value)} rows={2} placeholder="Behavioral correction for next session..." style={{ ...inputStyle, resize: "none" }} />
              </div>
              <div>
                <label style={labelStyle}>Corrective Rule Generated</label>
                <textarea value={trade.correctiveRuleGenerated} onChange={(e) => update("correctiveRuleGenerated", e.target.value)} rows={2} placeholder="e.g. No trades in first 15 min..." style={{ ...inputStyle, resize: "none" }} />
              </div>
            </div>
          </div>

          {/* ── NOTES ── */}
          <div>
            <label style={labelStyle}>Additional Notes</label>
            <textarea value={trade.notes} onChange={(e) => update("notes", e.target.value)} rows={1} placeholder="Context, observations, chart notes..." style={{ ...inputStyle, resize: "none" }} />
          </div>

        </div>
      )}
    </div>
  );
}

// ─── DAY BLOCK ────────────────────────────────────────────────────────────────
function DayBlock({ day, onUpdate, onDelete, patterns }) {
  const addTrade = () => onUpdate({ ...day, trades: [...day.trades, defaultTrade()] });
  const updateTrade = (u) => onUpdate({ ...day, trades: day.trades.map((t) => t.id === u.id ? u : t) });
  const deleteTrade = (id) => onUpdate({ ...day, trades: day.trades.filter((t) => t.id !== id) });
  const tp = day.trades.filter((t) => t.exitType === "TP Hit").length;
  const sl = day.trades.filter((t) => t.exitType === "SL Hit").length;
  const be = day.trades.filter((t) => t.exitType === "BE Exit").length;

  return (
    <div style={{ marginBottom: 36 }}>
      {/* Day Header */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 12, background: C.bg2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <input type="date" value={day.date} onChange={(e) => onUpdate({ ...day, date: e.target.value })} style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 14, fontFamily: font, outline: "none" }} />
            <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
              {tp > 0 && <span style={{ color: C.green }}>TP×{tp}</span>}
              {sl > 0 && <span style={{ color: C.red }}>SL×{sl}</span>}
              {be > 0 && <span style={{ color: C.yellow }}>BE×{be}</span>}
              <span style={{ color: C.textDim }}>{day.trades.length} trade{day.trades.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addTrade} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg3, color: C.textMuted, cursor: "pointer", fontFamily: font }}>+ Add Trade</button>
            <button onClick={() => onDelete(day.id)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg3, color: C.textDim, cursor: "pointer", fontFamily: font }}>Delete Day</button>
          </div>
        </div>
        {/* Session Context */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Session Bias</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PHASES.map((p) => <button key={p} onClick={() => onUpdate({ ...day, sessionBias: day.sessionBias === p ? "" : p })} style={chipStyle(day.sessionBias === p, p === "Imbalance" ? "yellow" : p === "Balance" ? "blue" : "gray")}>{p}</button>)}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Session Notes (pre-trade context)</label>
            <textarea value={day.sessionNotes} onChange={(e) => onUpdate({ ...day, sessionNotes: e.target.value })} rows={2} placeholder="Overnight range, macro bias, key levels..." style={{ ...inputStyle, resize: "none", fontSize: 11 }} />
          </div>
        </div>
      </div>

      <div style={{ borderLeft: `2px solid ${C.border}`, paddingLeft: 16 }}>
        {day.trades.length === 0 && <div style={{ color: C.textDim, fontSize: 12, padding: 16, textAlign: "center", border: `1px dashed ${C.border}`, borderRadius: 6 }}>No trades logged. Add one above.</div>}
        {day.trades.map((trade, i) => <TradeCard key={trade.id} trade={trade} index={i} onUpdate={updateTrade} onDelete={deleteTrade} patterns={patterns} />)}
      </div>
    </div>
  );
}

// ─── PATTERN SAVER ────────────────────────────────────────────────────────────
function PatternSaver({ patterns, onUpdate, allTrades }) {
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const addPattern = () => {
    const p = defaultPattern();
    onUpdate([...patterns, p]);
    setEditingId(p.id);
    setNewName(p.name);
    setNewDesc("");
  };

  const saveEdit = (id) => {
    onUpdate(patterns.map((p) => p.id === id ? { ...p, name: newName, description: newDesc } : p));
    setEditingId(null);
  };

  const deletePattern = (id) => onUpdate(patterns.filter((p) => p.id !== id));

  const getStats = (patternId) => {
    const trades = allTrades.filter((t) => t.patternId === patternId);
    const total = trades.length;
    const wins = trades.filter((t) => t.exitType === "TP Hit").length;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(0) : null;
    const rrValues = trades.filter((t) => t.actualRR !== "" && t.actualRR !== undefined).map((t) => parseFloat(t.actualRR)).filter((v) => !isNaN(v));
    const avgRR = rrValues.length > 0 ? (rrValues.reduce((a, b) => a + b, 0) / rrValues.length).toFixed(2) : null;
    return { total, wins, winRate, avgRR };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, color: C.textMuted }}>Tag trades to patterns when logging. Stats update automatically.</div>
        <button onClick={addPattern} style={{ fontSize: 11, padding: "6px 14px", borderRadius: 4, border: `1px solid ${C.purpleBorder}`, background: C.purpleBg, color: C.purple, cursor: "pointer", fontFamily: font }}>+ New Pattern</button>
      </div>

      {patterns.length === 0 && (
        <div style={{ color: C.textDim, fontSize: 12, padding: 24, textAlign: "center", border: `1px dashed ${C.border}`, borderRadius: 8 }}>No patterns yet. Create one and tag trades to it.</div>
      )}

      {patterns.map((p) => {
        const { total, wins, winRate, avgRR } = getStats(p.id);
        const isEditing = editingId === p.id;
        return (
          <div key={p.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, background: C.bg2 }}>
            {isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Pattern name..." style={inputStyle} />
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description — setup conditions, location, context..." rows={2} style={{ ...inputStyle, resize: "none" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => saveEdit(p.id)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 4, border: `1px solid ${C.greenBorder}`, background: C.greenBg, color: C.green, cursor: "pointer", fontFamily: font }}>Save</button>
                  <button onClick={() => setEditingId(null)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg3, color: C.textMuted, cursor: "pointer", fontFamily: font }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: C.purple, fontSize: 13, fontWeight: "bold" }}>{p.name}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setEditingId(p.id); setNewName(p.name); setNewDesc(p.description); }} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg3, color: C.textMuted, cursor: "pointer", fontFamily: font }}>Edit</button>
                    <button onClick={() => deletePattern(p.id)} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg3, color: C.textDim, cursor: "pointer", fontFamily: font }}>Delete</button>
                  </div>
                </div>
                {p.description && <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>{p.description}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                  {[
                    { label: "Trades", val: total, color: C.text },
                    { label: "Wins", val: wins, color: C.green },
                    { label: "Win Rate", val: winRate !== null ? `${winRate}%` : "—", color: winRate !== null && parseInt(winRate) >= 50 ? C.green : C.red },
                    { label: "Avg RR", val: avgRR !== null ? `${avgRR}R` : "—", color: avgRR !== null && parseFloat(avgRR) > 0 ? C.green : C.red },
                  ].map((s) => (
                    <div key={s.label} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px" }}>
                      <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 20, color: s.color, fontWeight: "bold" }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handle = async () => {
    setError(""); setSuccess(""); setLoading(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp(email, password);
      if (error) { setError(typeof error === "string" ? error : "Signup failed."); }
      else if (data?.access_token) { onAuth(data); }
      else { setSuccess("Account created. Check your email to confirm, then sign in."); setMode("signin"); }
    } else {
      const { data, error } = await supabase.auth.signIn(email, password);
      if (error) { setError(typeof error === "string" ? error : "Invalid credentials."); }
      else { onAuth(data); }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: font }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text, marginBottom: 4 }}>PBD/LAT · RCA Log</div>
          <div style={{ fontSize: 11, color: C.textDim }}>Root Cause Analysis — NY Session</div>
        </div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, background: C.bg2 }}>
          <div style={{ display: "flex", marginBottom: 24, border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden" }}>
            {["signin", "signup"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                style={{ flex: 1, padding: "8px 0", fontSize: 11, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.1em", border: "none", background: mode === m ? C.border2 : "transparent", color: mode === m ? C.text : C.textMuted, cursor: "pointer" }}>
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label style={labelStyle}>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handle()} style={inputStyle} /></div>
            <div><label style={labelStyle}>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handle()} style={inputStyle} /></div>
          </div>
          {error && <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 4, border: `1px solid ${C.redBorder}`, background: C.redBg, color: C.red, fontSize: 11 }}>{error}</div>}
          {success && <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 4, border: `1px solid ${C.greenBorder}`, background: C.greenBg, color: C.green, fontSize: 11 }}>{success}</div>}
          <button onClick={handle} disabled={loading || !email || !password}
            style={{ marginTop: 16, width: "100%", padding: "10px 0", background: C.border2, border: `1px solid #52525b`, color: C.text, fontSize: 11, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.1em", borderRadius: 4, cursor: loading ? "not-allowed" : "pointer", opacity: (!email || !password) ? 0.4 : 1 }}>
            {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function RCALog() {
  const [session, setSession] = useState(null);
  const [days, setDays] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [view, setView] = useState("log");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const existing = supabase.auth.getSession();
      if (existing?.access_token) {
        const refreshed = await supabase.auth.refreshSession();
        setSession(refreshed || existing);
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const userId = session.user?.id || session.user_id || (session.user && session.user.sub);
    console.log('Session user ID:', userId, 'Session:', JSON.stringify(session).slice(0,200));
    if (!userId) { setDays([defaultDay()]); setLoading(false); return; }
    const db = await supabase.from("trades");
    const { data, error } = await db.select(`user_id=eq.${userId}&order=updated_at.desc`);
    if (!error && data && data.length > 0) {
      setDays(data.map((row) => row.data));
    } else if (!error && (!data || data.length === 0)) {
      setDays([defaultDay()]);
    }
    // Load patterns
    const pdb = await supabase.from("trades");
    const { data: pdata } = await pdb.select(`user_id=eq.${userId}_patterns`);
    if (pdata && pdata.length > 0 && pdata[0].data) { setPatterns(pdata[0].data); }
    setLoading(false);
  }, [session]);

  useEffect(() => { if (session) loadData(); }, [session, loadData]);

  const saveData = useCallback(async (daysToSave, patternsToSave) => {
    if (!session) return;
    setSaveStatus("saving");
    const userId = session.user?.id || session.user_id || (session.user && session.user.sub);
    if (!userId) { setSaveStatus("error"); return; }
    const db = await supabase.from("trades");
    await db.delete(`user_id=eq.${userId}`);
    const rows = daysToSave.map((day) => ({ id: day.id, user_id: userId, data: day, updated_at: new Date().toISOString() }));
    // Save patterns as a special row
    rows.push({ id: `${userId}_patterns_row`, user_id: `${userId}_patterns`, data: patternsToSave, updated_at: new Date().toISOString() });
    const { error } = await db.upsert(rows);
    setSaveStatus(error ? "error" : "saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [session]);

  useEffect(() => {
    if (!session || days.length === 0) return;
    const timer = setTimeout(() => saveData(days, patterns), 1200);
    return () => clearTimeout(timer);
  }, [days, patterns, session, saveData]);

  const allTrades = days.flatMap((d) => d.trades);
  const byExit = (type) => allTrades.filter((t) => t.exitType === type).length;
  const byError = (cls) => allTrades.filter((t) => t.errorClass === cls).length;
  const total = allTrades.length;
  const rrValues = allTrades.filter((t) => t.actualRR !== "" && t.actualRR !== undefined).map((t) => parseFloat(t.actualRR)).filter((v) => !isNaN(v));
  const avgRR = rrValues.length > 0 ? (rrValues.reduce((a, b) => a + b, 0) / rrValues.length).toFixed(2) : null;
  const beWithReason = allTrades.filter((t) => t.exitType === "BE Exit" && t.beReason);
  const handleSignOut = async () => { await supabase.auth.signOut(); setSession(null); setDays([]); setPatterns([]); };

  if (loading && !session) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: C.textDim, fontSize: 12, fontFamily: font }}>loading...</span></div>;
  if (!session) return <AuthScreen onAuth={(s) => setSession(s)} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: font }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(9,9,11,0.97)", zIndex: 10, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text }}>PBD/LAT · RCA Log</div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
            Root Cause Analysis — NY Session
            {saveStatus === "saving" && <span style={{ color: C.textMuted, marginLeft: 8 }}>· saving...</span>}
            {saveStatus === "saved" && <span style={{ color: C.greenBorder, marginLeft: 8 }}>· saved ✓</span>}
            {saveStatus === "error" && <span style={{ color: C.redBorder, marginLeft: 8 }}>· save failed</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["log", "summary", "patterns"].map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 4, border: `1px solid ${view === v ? "#52525b" : C.border}`, background: view === v ? C.border2 : C.bg2, color: view === v ? C.text : C.textMuted, cursor: "pointer", fontFamily: font, letterSpacing: "0.05em", textTransform: "uppercase" }}>{v}</button>
          ))}
          <button onClick={handleSignOut} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg2, color: C.textDim, cursor: "pointer", fontFamily: font }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
        {loading ? <div style={{ color: C.textDim, fontSize: 12, textAlign: "center", padding: 60 }}>Loading your logs...</div>

        : view === "log" ? (
          <>
            {days.map((day) => <DayBlock key={day.id} day={day} onUpdate={(u) => setDays(days.map((d) => d.id === u.id ? u : d))} onDelete={(id) => setDays(days.filter((d) => d.id !== id))} patterns={patterns} />)}
            <button onClick={() => setDays([...days, defaultDay()])} style={{ width: "100%", padding: 12, border: `1px dashed ${C.border}`, borderRadius: 6, background: "transparent", color: C.textMuted, fontSize: 13, fontFamily: font, cursor: "pointer" }}>+ Add New Day</button>
          </>

        ) : view === "patterns" ? (
          <PatternSaver patterns={patterns} onUpdate={setPatterns} allTrades={allTrades} />

        ) : (
          /* SUMMARY */
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Top stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
              {[
                { label: "Total Trades", val: total, color: C.text },
                { label: "TP Hit", val: byExit("TP Hit"), color: C.green },
                { label: "SL Hit", val: byExit("SL Hit"), color: C.red },
                { label: "BE Exit", val: byExit("BE Exit"), color: C.yellow },
                { label: "Avg RR", val: avgRR !== null ? `${avgRR}R` : "—", color: avgRR !== null && parseFloat(avgRR) > 0 ? C.green : C.red },
                { label: "Win Rate", val: total > 0 ? `${((byExit("TP Hit") / total) * 100).toFixed(0)}%` : "—", color: C.text },
              ].map((stat) => (
                <div key={stat.label} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontSize: 26, color: stat.color }}>{stat.val}</div>
                  {total > 0 && stat.label !== "Total Trades" && stat.label !== "Avg RR" && stat.label !== "Win Rate" && (
                    <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{((parseInt(stat.val) / total) * 100).toFixed(0)}%</div>
                  )}
                </div>
              ))}
            </div>

            {/* Error breakdown */}
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Error Classification</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ERROR_CLASSES.map((cls) => {
                  const count = byError(cls);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  const barColor = { "Valid Loss": C.greenBorder, "Model Error": C.redBorder, "Execution Error": C.yellowBorder, "Read Error": C.blueBorder, "Regime Misread": "#7c3aed", "Confirmation Stacking": C.purpleBorder }[cls] || C.textDim;
                  return (
                    <div key={cls} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 11, color: C.textMuted, width: 150, flexShrink: 0 }}>{cls}</div>
                      <div style={{ flex: 1, background: C.border, borderRadius: 4, height: 4 }}><div style={{ width: `${pct}%`, height: 4, borderRadius: 4, background: barColor }} /></div>
                      <div style={{ fontSize: 11, color: C.textMuted, width: 20, textAlign: "right" }}>{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BE Reason breakdown */}
            {byExit("BE Exit") > 0 && (
              <div style={{ background: C.bg2, border: `1px solid ${C.yellowBorder}`, borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 10, color: C.yellow, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>BE Exit Breakdown</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {BE_REASONS.map((r) => {
                    const count = beWithReason.filter((t) => t.beReason === r).length;
                    return count > 0 ? (
                      <div key={r} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px" }}>
                        <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>{r}</div>
                        <div style={{ fontSize: 18, color: r === "Legitimate Read" ? C.green : C.yellow }}>{count}</div>
                      </div>
                    ) : null;
                  })}
                  {beWithReason.length === 0 && <div style={{ fontSize: 11, color: C.textDim }}>No BE reasons logged yet.</div>}
                </div>
              </div>
            )}

            {/* Location breakdown */}
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Entry Location Breakdown</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {LOCATIONS.map((l) => {
                  const count = allTrades.filter((t) => t.location === l).length;
                  const wins = allTrades.filter((t) => t.location === l && t.exitType === "TP Hit").length;
                  return count > 0 ? (
                    <div key={l} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", minWidth: 80 }}>
                      <div style={{ fontSize: 10, color: C.blue, marginBottom: 4 }}>{l}</div>
                      <div style={{ fontSize: 18, color: C.text }}>{count}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>{count > 0 ? `${((wins / count) * 100).toFixed(0)}% W` : ""}</div>
                    </div>
                  ) : null;
                })}
                {allTrades.filter((t) => t.location).length === 0 && <div style={{ fontSize: 11, color: C.textDim }}>No location data yet.</div>}
              </div>
            </div>

            {/* Corrective rules */}
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Corrective Rules Generated</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {allTrades.filter((t) => t.correctiveRuleGenerated).map((t) => (
                  <div key={t.id} style={{ fontSize: 11, borderLeft: `2px solid ${C.redBorder}`, paddingLeft: 12, color: C.red }}>{t.correctiveRuleGenerated}</div>
                ))}
                {allTrades.filter((t) => t.correctiveRuleGenerated).length === 0 && <div style={{ fontSize: 11, color: C.textDim }}>No rules generated yet.</div>}
              </div>
            </div>

            {/* Recent corrective actions */}
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Recent Corrective Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {allTrades.filter((t) => t.correctiveAction).slice(-5).reverse().map((t) => (
                  <div key={t.id} style={{ display: "flex", gap: 12, fontSize: 11, borderLeft: `2px solid ${C.border}`, paddingLeft: 12 }}>
                    <span style={{ color: t.direction === "Long" ? C.green : C.red, flexShrink: 0 }}>{t.direction}</span>
                    <span style={{ color: "#d4d4d8" }}>{t.correctiveAction}</span>
                  </div>
                ))}
                {allTrades.filter((t) => t.correctiveAction).length === 0 && <div style={{ fontSize: 11, color: C.textDim }}>No corrective actions logged yet.</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
