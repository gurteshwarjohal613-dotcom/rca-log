import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://oowtwcmfczhmunbsamjt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vd3R3Y21mY3pobXVuYnNhbWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NzMxMDUsImV4cCI6MjA5NDM0OTEwNX0.Y56mkz7wV6q1U0DqE8FhoBYCD_n1W0GNnwuXohLLol4";

const SESSION_KEY = "rca_sb_session";
const saveSession = (d) => { const s = JSON.stringify(d); try { localStorage.setItem(SESSION_KEY, s); } catch(e) {} try { sessionStorage.setItem(SESSION_KEY, s); } catch(e) {} };
const loadSession = () => { try { const s = localStorage.getItem(SESSION_KEY); if (s) return JSON.parse(s); } catch(e) {} try { const s = sessionStorage.getItem(SESSION_KEY); if (s) return JSON.parse(s); } catch(e) {} return null; };
const clearSession = () => { try { localStorage.removeItem(SESSION_KEY); } catch(e) {} try { sessionStorage.removeItem(SESSION_KEY); } catch(e) {} };

const supabase = {
  _h: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
  auth: {
    _s: null,
    async signUp(email, password) {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY }, body: JSON.stringify({ email, password }) });
      const d = await r.json();
      if (d.access_token) { this._s = d; saveSession(d); }
      return { data: d, error: d.error || null };
    },
    async signIn(email, password) {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY }, body: JSON.stringify({ email, password }) });
      const d = await r.json();
      if (d.access_token) { this._s = d; saveSession(d); }
      return { data: d, error: d.error_description || d.error || null };
    },
    async refresh() {
      const s = this.get(); if (!s?.refresh_token) return null;
      try {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
        const d = await r.json();
        if (d.access_token) { this._s = d; saveSession(d); return d; }
      } catch(e) {} return null;
    },
    async signOut() {
      const s = this.get();
      if (s) { try { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${s.access_token}` } }); } catch(e) {} }
      this._s = null; clearSession();
    },
    get() { if (this._s) return this._s; const s = loadSession(); if (s) { this._s = s; return s; } return null; },
  },
  async db(table) {
    const s = supabase.auth.get();
    const auth = s ? `Bearer ${s.access_token}` : `Bearer ${SUPABASE_ANON_KEY}`;
    const h = { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": auth };
    return {
      async select(f = "") { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${f ? "?" + f : ""}`, { headers: h }); const d = await r.json(); return { data: d, error: r.ok ? null : d }; },
      async upsert(body) { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...h, "Prefer": "resolution=merge-duplicates" }, body: JSON.stringify(body) }); return { error: r.ok ? null : await r.text() }; },
      async del(f = "") { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${f}`, { method: "DELETE", headers: h }); return { error: r.ok ? null : await r.text() }; },
    };
  },
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const INSTRUMENTS = ["NQ", "ES", "CL", "GC", "Other"];
const DIRECTIONS = ["Long", "Short"];
const LOCATIONS = ["LVN", "VAH", "VAL", "POC", "IB High", "IB Low", "VWAP Band", "HVN", "Inside Value", "Outside Value", "Other"];
const DISTRIBUTIONS = ["Normal", "P-Shape", "B-Shape", "Double Distribution", "Trending/Elongated", "Unclear"];
const PHASES = ["Balance", "Imbalance"];
const DAY_TYPES = ["Balanced", "Trend", "Neutral", "Double Distribution", "Short Covering", "Long Liquidation"];
const MECHANISMS = ["Absorption", "Acceptance", "Rejection", "Aggression", "Exhaustion"];
const EXIT_TYPES = ["SL Hit", "BE Exit", "TP Hit", "Manual Exit"];
const TP_TYPES = ["OCO Default (1:2)", "Discretionary Adjusted", "Trailing Stop"];
const BE_REASONS = ["Fear", "Legitimate Read", "Premature", "Noise / No Reason"];
const ERROR_CLASSES = ["Valid Loss", "Model Error", "Execution Error", "Read Error", "Environment Mismatch", "Confirmation Addiction"];
const EXEC_QUALITY = ["Clean", "Late", "Early", "Sized Wrong", "Hesitated"];
const MENTAL_STATES = ["Calm", "Focused", "Anxious", "Impatient", "Angry", "Overconfident", "Distracted"];
const READING_QUALITY = ["Sharp", "Neutral", "Biased", "Missed Key Data", "Price-Led"];

const CONFIRMATION_SIGNALS = [
  "Price at Pre-Marked Location",
  "Bias Defined (Balance/Imbalance)",
  "Acceptance or Rejection Observable",
  "CVD Delta > 10%",
  "Big Trade Present",
  "Absorption Confirmed",
  "Aggression Confirmed",
  "Direction Aligns with Session Bias",
];

const DEFAULT_RULES = [
  { id: "r1", text: "No trades in first 15 minutes of session" },
  { id: "r2", text: "Only trade at pre-marked locations" },
  { id: "r3", text: "All 3 confirmation triggers must align before entry" },
];

const DEFAULT_PATTERNS = [
  { id: "pat_far", name: "FAR — Failed Auction Reversal", description: "Price auctions outside VAH/VAL into LVN/VWAP deviation, fails, absorption visible, returns inside value. Fade back to VWAP/POC. Best on rotational/balanced days. Fails on trend days." },
  { id: "pat_rt", name: "RT — Retest Continuation", description: "Acceptance already confirmed. Retest of broken VAH/VAL/VWAP/LVN with rejection confirming continuation. Cleaner entry than breakout. Better RR stability." },
  { id: "pat_itc", name: "ITC — Initiative Trend Continuation", description: "Persistent directional delta, Big Trades stacked, single prints holding, shallow pullbacks, acceptance outside value. Entry on pullback to VWAP/LVN/broken VAH/VAL. Stay with imbalance." },
  { id: "pat_ilr", name: "ILR — Internal LVN Rotation", description: "LVN inside value creates local rejection/acceptance. Price rotates through value, delta confirms locally. Smaller targets, faster trade, intra-auction rotation capture." },
  { id: "pat_vat", name: "VAT — Value Area Transition", description: "Double distribution context. Price transitions between two value areas through separating LVN. Entry at deviation band/VAL as price re-enters lower value area. Target VWAP or opposite VA." },
];

const isWin = (t) => t.exitType === "TP Hit" || (t.exitType === "Manual Exit" && parseFloat(t.actualRR) > 0);

const defaultTrade = (rules = []) => ({
  id: `t_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  time: "", instrument: "NQ", direction: "Long",
  locations: [], distributionPrior: "", distributionCurrent: "", phase: "",
  mechanisms: [], primaryMechanism: "",
  signals: {},
  ruleAdherence: Object.fromEntries(rules.map((r) => [r.id, false])),
  executionQuality: "",
  mentalState: "", readingQuality: "", sessionQuality: "",
  exitType: "", tpType: "", beReason: "", plannedRR: "2", actualRR: "",
  exitReason: "",
  errorClass: "", confirmationAddiction: false,
  correctiveAction: "", correctiveRuleGenerated: "",
  patternId: "", notes: "",
});

const defaultDay = (rules = []) => ({
  id: `d_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  date: new Date().toISOString().split("T")[0],
  sessionBias: "", dayType: "", sessionNotes: "",
  trades: [defaultTrade(rules)],
});

// ─── COLORS & STYLES ──────────────────────────────────────────────────────────
const C = {
  bg: "#09090b", bg2: "#111113", bg3: "#18181b", border: "#27272a", border2: "#3f3f46",
  text: "#e4e4e7", textMuted: "#71717a", textDim: "#52525b",
  green: "#6ee7b7", greenBg: "rgba(6,78,59,0.4)", greenBorder: "#059669",
  red: "#fca5a5", redBg: "rgba(127,29,29,0.4)", redBorder: "#dc2626",
  yellow: "#fcd34d", yellowBg: "rgba(113,63,18,0.4)", yellowBorder: "#d97706",
  blue: "#93c5fd", blueBg: "rgba(30,58,138,0.4)", blueBorder: "#2563eb",
  purple: "#c4b5fd", purpleBg: "rgba(109,40,217,0.3)", purpleBorder: "#7c3aed",
  orange: "#fdba74", orangeBg: "rgba(154,52,18,0.3)", orangeBorder: "#ea580c",
};
const font = "'IBM Plex Mono', 'Courier New', monospace";
const inp = { width: "100%", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", color: C.text, fontSize: 13, fontFamily: font, outline: "none", boxSizing: "border-box" };
const lbl = { display: "block", fontSize: 10, color: C.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" };
const sec = { fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 };

const chip = (active, color) => {
  const m = { green: [C.greenBg, C.greenBorder, C.green], red: [C.redBg, C.redBorder, C.red], yellow: [C.yellowBg, C.yellowBorder, C.yellow], blue: [C.blueBg, C.blueBorder, C.blue], purple: [C.purpleBg, C.purpleBorder, C.purple], orange: [C.orangeBg, C.orangeBorder, C.orange] };
  const [bg, border, text] = active ? (m[color] || ["#27272a", C.border2, C.text]) : ["#18181b", C.border, C.textMuted];
  return { fontSize: 11, padding: "6px 10px", borderRadius: 4, border: `1px solid ${border}`, background: bg, color: text, cursor: "pointer", fontFamily: font };
};

const badge = (color) => {
  const m = { green: [C.greenBg, C.greenBorder, C.green], red: [C.redBg, C.redBorder, C.red], yellow: [C.yellowBg, C.yellowBorder, C.yellow], blue: [C.blueBg, C.blueBorder, C.blue], gray: ["#27272a", C.border2, C.textMuted], purple: [C.purpleBg, C.purpleBorder, C.purple], orange: [C.orangeBg, C.orangeBorder, C.orange] };
  const [bg, border, text] = m[color] || m.gray;
  return { fontSize: 10, padding: "2px 6px", borderRadius: 4, border: `1px solid ${border}`, background: bg, color: text, fontFamily: font, letterSpacing: "0.05em" };
};

const exitColor = (t) => ({ "TP Hit": "green", "SL Hit": "red", "BE Exit": "yellow", "Manual Exit": "gray" }[t] || "gray");
const errColor = (c) => ({ "Valid Loss": "green", "Model Error": "red", "Environment Mismatch": "red", "Execution Error": "yellow", "Read Error": "blue", "Confirmation Addiction": "purple" }[c] || "gray");

function CB({ checked, onChange, label, color }) {
  const ac = color === "red" ? C.red : color === "yellow" ? C.yellow : C.green;
  const ab = color === "red" ? C.redBorder : color === "yellow" ? C.yellowBorder : C.greenBorder;
  const abg = color === "red" ? C.redBg : color === "yellow" ? C.yellowBg : C.greenBg;
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 12, color: checked ? ac : C.textMuted, padding: "3px 0" }}>
      <div onClick={onChange} style={{ width: 15, height: 15, border: `1px solid ${checked ? ab : C.border2}`, borderRadius: 3, background: checked ? abg : C.bg3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", marginTop: 1 }}>
        {checked && <span style={{ color: ac, fontSize: 9, lineHeight: 1 }}>✓</span>}
      </div>
      <span>{label}</span>
    </label>
  );
}

// ─── TRADE CARD ───────────────────────────────────────────────────────────────
function TradeCard({ trade, onUpdate, onDelete, index, patterns, rules }) {
  const [open, setOpen] = useState(true);
  const upd = (f, v) => onUpdate({ ...trade, [f]: v });
  const toggleLoc = (l) => { const ls = trade.locations || []; upd("locations", ls.includes(l) ? ls.filter((x) => x !== l) : [...ls, l]); };
  const toggleMech = (m) => { const ms = trade.mechanisms || []; const updated = ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m]; const newPrimary = updated.length === 0 ? "" : updated.includes(trade.primaryMechanism) ? trade.primaryMechanism : updated[0]; onUpdate({ ...trade, mechanisms: updated, primaryMechanism: newPrimary }); };
  const toggleSig = (s) => onUpdate({ ...trade, signals: { ...trade.signals, [s]: !trade.signals[s] } });
  const toggleRule = (id) => upd("ruleAdherence", { ...trade.ruleAdherence, [id]: !trade.ruleAdherence?.[id] });
  const locs = trade.locations || [];
  const mechs = trade.mechanisms || [];
  const ruleAdherence = trade.ruleAdherence || {};
  const rulesFollowed = rules.filter((r) => ruleAdherence[r.id]).length;
  const rulesPct = rules.length > 0 ? Math.round((rulesFollowed / rules.length) * 100) : null;

  return (
    <div style={{ border: `1px solid ${trade.confirmationAddiction ? C.purpleBorder : C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 12, background: C.bg2 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: C.bg3, cursor: "pointer", flexWrap: "wrap", gap: 8 }} onClick={() => setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: C.textDim, fontSize: 11 }}>#{String(index + 1).padStart(2, "0")}</span>
          <span style={{ color: C.text, fontSize: 13 }}>{trade.time || "??:??"}</span>
          <span style={{ color: trade.direction === "Long" ? C.green : C.red, fontSize: 11, fontWeight: "bold" }}>{trade.direction}</span>
          <span style={{ color: C.textMuted, fontSize: 11 }}>{trade.instrument}</span>
          {trade.primaryMechanism && <span style={badge("orange")}>{trade.primaryMechanism}</span>}
          {locs.length > 0 && <span style={badge("blue")}>{locs.join("+")}</span>}
          {trade.patternId && patterns.find((p) => p.id === trade.patternId) && <span style={badge("purple")}>{patterns.find((p) => p.id === trade.patternId).name.split("—")[0].trim()}</span>}
          {trade.exitType && <span style={badge(exitColor(trade.exitType))}>{trade.exitType}</span>}
          {trade.actualRR && <span style={badge(parseFloat(trade.actualRR) > 0 ? "green" : "red")}>{trade.actualRR}R</span>}
          {trade.errorClass && <span style={badge(errColor(trade.errorClass))}>{trade.errorClass}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {rulesPct !== null && <span style={{ color: rulesPct === 100 ? C.greenBorder : rulesPct >= 50 ? C.yellow : C.redBorder, fontSize: 11 }}>{rulesPct}% rules</span>}
          <button onClick={(e) => { e.stopPropagation(); onDelete(trade.id); }} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 12 }}>✕</button>
          <span style={{ color: C.textDim, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* BASIC */}
          <div>
            <div style={sec}>Basic Info</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
              <div><label style={lbl}>Time</label><input type="time" value={trade.time} onChange={(e) => upd("time", e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Instrument</label><select value={trade.instrument} onChange={(e) => upd("instrument", e.target.value)} style={inp}>{INSTRUMENTS.map((i) => <option key={i}>{i}</option>)}</select></div>
              <div><label style={lbl}>Direction</label><div style={{ display: "flex", gap: 6 }}>{DIRECTIONS.map((d) => <button key={d} onClick={() => upd("direction", d)} style={{ ...chip(trade.direction === d, d === "Long" ? "green" : "red"), flex: 1 }}>{d}</button>)}</div></div>
              <div><label style={lbl}>Pattern</label><select value={trade.patternId} onChange={(e) => upd("patternId", e.target.value)} style={inp}><option value="">None</option>{patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            </div>
          </div>

          {/* MARKET CONTEXT */}
          <div>
            <div style={sec}>Market Context</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Phase at Entry</label><div style={{ display: "flex", gap: 6 }}>{PHASES.map((p) => <button key={p} onClick={() => upd("phase", trade.phase === p ? "" : p)} style={chip(trade.phase === p, p === "Imbalance" ? "yellow" : "blue")}>{p}</button>)}</div></div>
              <div><label style={lbl}>Prior Distribution</label><select value={trade.distributionPrior} onChange={(e) => upd("distributionPrior", e.target.value)} style={inp}><option value="">Select...</option>{DISTRIBUTIONS.map((d) => <option key={d}>{d}</option>)}</select></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={lbl}>Current Distribution</label><select value={trade.distributionCurrent} onChange={(e) => upd("distributionCurrent", e.target.value)} style={inp}><option value="">Select...</option>{DISTRIBUTIONS.map((d) => <option key={d}>{d}</option>)}</select></div>
            <div>
              <label style={lbl}>Entry Location — multi-select</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {LOCATIONS.map((l) => <button key={l} onClick={() => toggleLoc(l)} style={chip(locs.includes(l), "blue")}>{l}</button>)}
              </div>
              {locs.length > 0 && <div style={{ fontSize: 10, color: C.blue, marginTop: 4 }}>Selected: {locs.join(" + ")}</div>}
            </div>
          </div>

          {/* MECHANISM */}
          <div>
            <div style={sec}>Mechanism — what the market is doing</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {MECHANISMS.map((m) => (
                <button key={m} onClick={() => toggleMech(m)} style={chip(mechs.includes(m), "orange")}>{m}</button>
              ))}
            </div>
            {mechs.length > 1 && (
              <div>
                <label style={lbl}>Primary Mechanism</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {mechs.map((m) => (
                    <button key={m} onClick={() => upd("primaryMechanism", m)}
                      style={{ ...chip(trade.primaryMechanism === m, "orange"), border: trade.primaryMechanism === m ? `1px solid ${C.orangeBorder}` : `1px dashed ${C.border2}` }}>
                      {trade.primaryMechanism === m ? "★ " : ""}{m}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mechs.length === 1 && trade.primaryMechanism !== mechs[0] && upd("primaryMechanism", mechs[0]) === undefined && null}
          </div>

          {/* CONFIRMATION SIGNALS */}
          <div>
            <div style={sec}>Confirmation Signals — signals used to identify mechanism</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {CONFIRMATION_SIGNALS.map((s) => (
                <CB key={s} checked={!!trade.signals[s]} onChange={() => toggleSig(s)} label={s} />
              ))}
            </div>
          </div>

          {/* RULES ADHERENCE */}
          {rules.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ ...sec, marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>Rules Adherence</div>
                {rulesPct !== null && <span style={{ fontSize: 10, color: rulesPct === 100 ? C.green : rulesPct >= 50 ? C.yellow : C.red }}>{rulesFollowed}/{rules.length} followed</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {rules.map((r) => <CB key={r.id} checked={!!ruleAdherence[r.id]} onChange={() => toggleRule(r.id)} label={r.text} />)}
              </div>
            </div>
          )}

          {/* EXECUTION */}
          <div>
            <div style={sec}>Execution</div>
            <label style={lbl}>Execution Quality</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {EXEC_QUALITY.map((q) => <button key={q} onClick={() => upd("executionQuality", trade.executionQuality === q ? "" : q)} style={chip(trade.executionQuality === q, "blue")}>{q}</button>)}
            </div>
            <CB checked={!!trade.confirmationAddiction} onChange={() => upd("confirmationAddiction", !trade.confirmationAddiction)} label="Confirmation Addiction — delayed entry waiting for redundant signals beyond 3-trigger requirement" color="red" />
          </div>

          {/* MOOD */}
          <div>
            <div style={sec}>Mood & Market Observation</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Mental State</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {MENTAL_STATES.map((m) => <button key={m} onClick={() => upd("mentalState", trade.mentalState === m ? "" : m)} style={chip(trade.mentalState === m, m === "Calm" || m === "Focused" ? "green" : m === "Overconfident" || m === "Angry" ? "red" : "yellow")}>{m}</button>)}
                </div>
              </div>
              <div>
                <label style={lbl}>Market Reading Quality</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {READING_QUALITY.map((r) => <button key={r} onClick={() => upd("readingQuality", trade.readingQuality === r ? "" : r)} style={chip(trade.readingQuality === r, r === "Sharp" ? "green" : r === "Neutral" ? "blue" : "red")}>{r}</button>)}
                </div>
              </div>
            </div>
            <div>
              <label style={lbl}>Overall Session Quality (1=poor 5=excellent)</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => upd("sessionQuality", trade.sessionQuality === String(n) ? "" : String(n))} style={{ ...chip(trade.sessionQuality === String(n), trade.sessionQuality === String(n) ? (n >= 4 ? "green" : n === 3 ? "yellow" : "red") : "gray"), width: 40, textAlign: "center" }}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          {/* EXIT */}
          <div>
            <div style={sec}>Exit</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Planned RR (1:X)</label><input type="number" value={trade.plannedRR} onChange={(e) => upd("plannedRR", e.target.value)} placeholder="2" style={inp} min="0" step="0.5" /></div>
              <div><label style={lbl}>Actual RR (negative = loss)</label><input type="number" value={trade.actualRR} onChange={(e) => upd("actualRR", e.target.value)} placeholder="e.g. 2 or -1" style={inp} step="0.1" /></div>
            </div>
            <label style={lbl}>Exit Type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {EXIT_TYPES.map((e) => <button key={e} onClick={() => upd("exitType", trade.exitType === e ? "" : e)} style={chip(trade.exitType === e, exitColor(e))}>{e}</button>)}
            </div>
            {trade.exitType === "TP Hit" && <div style={{ marginBottom: 10 }}><label style={lbl}>TP Method</label><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{TP_TYPES.map((t) => <button key={t} onClick={() => upd("tpType", trade.tpType === t ? "" : t)} style={chip(trade.tpType === t, "green")}>{t}</button>)}</div></div>}
            {trade.exitType === "BE Exit" && <div style={{ marginBottom: 10 }}><label style={lbl}>BE Exit Reason</label><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{BE_REASONS.map((r) => <button key={r} onClick={() => upd("beReason", trade.beReason === r ? "" : r)} style={chip(trade.beReason === r, r === "Legitimate Read" ? "green" : "red")}>{r}</button>)}</div></div>}
            <label style={lbl}>Exit Trigger / What Happened</label>
            <textarea value={trade.exitReason} onChange={(e) => upd("exitReason", e.target.value)} rows={2} placeholder="e.g. Opposite side absorbed at HOD..." style={{ ...inp, resize: "none" }} />
          </div>

          {/* ERROR & RCA */}
          <div>
            <div style={sec}>Error Classification & RCA</div>
            <label style={lbl}>Error Class</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {ERROR_CLASSES.map((e) => <button key={e} onClick={() => upd("errorClass", trade.errorClass === e ? "" : e)} style={chip(trade.errorClass === e, errColor(e))}>{e}</button>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lbl}>Corrective Action</label><textarea value={trade.correctiveAction} onChange={(e) => upd("correctiveAction", e.target.value)} rows={2} placeholder="Behavioral correction for next session..." style={{ ...inp, resize: "none" }} /></div>
              <div><label style={lbl}>Corrective Rule Generated</label><textarea value={trade.correctiveRuleGenerated} onChange={(e) => upd("correctiveRuleGenerated", e.target.value)} rows={2} placeholder="e.g. No trades in first 15 min..." style={{ ...inp, resize: "none" }} /></div>
            </div>
          </div>

          {/* NOTES */}
          <div><label style={lbl}>Additional Notes</label><textarea value={trade.notes} onChange={(e) => upd("notes", e.target.value)} rows={1} placeholder="Context, observations, chart notes..." style={{ ...inp, resize: "none" }} /></div>
        </div>
      )}
    </div>
  );
}

// ─── DAY BLOCK ────────────────────────────────────────────────────────────────
function DayBlock({ day, onUpdate, onDelete, patterns, rules }) {
  const addTrade = () => onUpdate({ ...day, trades: [...day.trades, defaultTrade(rules)] });
  const updateTrade = (u) => onUpdate({ ...day, trades: day.trades.map((t) => t.id === u.id ? u : t) });
  const deleteTrade = (id) => onUpdate({ ...day, trades: day.trades.filter((t) => t.id !== id) });
  const tp = day.trades.filter((t) => t.exitType === "TP Hit").length;
  const sl = day.trades.filter((t) => t.exitType === "SL Hit").length;
  const be = day.trades.filter((t) => t.exitType === "BE Exit").length;
  const wins = day.trades.filter(isWin).length;

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 12, background: C.bg2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <input type="date" value={day.date} onChange={(e) => onUpdate({ ...day, date: e.target.value })} style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 14, fontFamily: font, outline: "none" }} />
            <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
              {tp > 0 && <span style={{ color: C.green }}>TP×{tp}</span>}
              {sl > 0 && <span style={{ color: C.red }}>SL×{sl}</span>}
              {be > 0 && <span style={{ color: C.yellow }}>BE×{be}</span>}
              {wins > 0 && <span style={{ color: C.green }}>W×{wins}</span>}
              <span style={{ color: C.textDim }}>{day.trades.length} trade{day.trades.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addTrade} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg3, color: C.textMuted, cursor: "pointer", fontFamily: font }}>+ Add Trade</button>
            <button onClick={() => onDelete(day.id)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg3, color: C.textDim, cursor: "pointer", fontFamily: font }}>Delete Day</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div><label style={lbl}>Session Bias</label><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{PHASES.map((p) => <button key={p} onClick={() => onUpdate({ ...day, sessionBias: day.sessionBias === p ? "" : p })} style={chip(day.sessionBias === p, p === "Imbalance" ? "yellow" : "blue")}>{p}</button>)}</div></div>
          <div><label style={lbl}>Day Type</label><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{DAY_TYPES.map((d) => <button key={d} onClick={() => onUpdate({ ...day, dayType: day.dayType === d ? "" : d })} style={chip(day.dayType === d, d === "Trend" || d === "Short Covering" || d === "Long Liquidation" ? "yellow" : d === "Balanced" ? "blue" : "gray")}>{d}</button>)}</div></div>
          <div><label style={lbl}>Session Notes</label><textarea value={day.sessionNotes} onChange={(e) => onUpdate({ ...day, sessionNotes: e.target.value })} rows={2} placeholder="Overnight range, macro bias, key levels..." style={{ ...inp, resize: "none", fontSize: 11 }} /></div>
        </div>
      </div>
      <div style={{ borderLeft: `2px solid ${C.border}`, paddingLeft: 16 }}>
        {day.trades.length === 0 && <div style={{ color: C.textDim, fontSize: 12, padding: 16, textAlign: "center", border: `1px dashed ${C.border}`, borderRadius: 6 }}>No trades logged. Add one above.</div>}
        {day.trades.map((trade, i) => <TradeCard key={trade.id} trade={trade} index={i} onUpdate={updateTrade} onDelete={deleteTrade} patterns={patterns} rules={rules} />)}
      </div>
    </div>
  );
}

// ─── RULES MANAGER ────────────────────────────────────────────────────────────
function RulesManager({ rules, onUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [newText, setNewText] = useState("");

  const addRule = () => {
    if (!newText.trim()) return;
    onUpdate([...rules, { id: `r_${Date.now()}`, text: newText.trim() }]);
    setNewText("");
  };

  const saveEdit = (id) => { onUpdate(rules.map((r) => r.id === id ? { ...r, text: editText } : r)); setEditingId(null); };
  const deleteRule = (id) => onUpdate(rules.filter((r) => r.id !== id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: C.textMuted }}>These rules appear as checkboxes on every trade. Check them to confirm you followed the rule that trade.</div>
      {rules.map((r) => (
        <div key={r.id} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, background: C.bg2, display: "flex", alignItems: "center", gap: 10 }}>
          {editingId === r.id ? (
            <>
              <input value={editText} onChange={(e) => setEditText(e.target.value)} style={{ ...inp, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && saveEdit(r.id)} />
              <button onClick={() => saveEdit(r.id)} style={{ fontSize: 11, padding: "6px 10px", borderRadius: 4, border: `1px solid ${C.greenBorder}`, background: C.greenBg, color: C.green, cursor: "pointer", fontFamily: font }}>Save</button>
              <button onClick={() => setEditingId(null)} style={{ fontSize: 11, padding: "6px 10px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg3, color: C.textMuted, cursor: "pointer", fontFamily: font }}>Cancel</button>
            </>
          ) : (
            <>
              <span style={{ flex: 1, fontSize: 12, color: C.text }}>{r.text}</span>
              <button onClick={() => { setEditingId(r.id); setEditText(r.text); }} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg3, color: C.textMuted, cursor: "pointer", fontFamily: font }}>Edit</button>
              <button onClick={() => deleteRule(r.id)} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg3, color: C.textDim, cursor: "pointer", fontFamily: font }}>Delete</button>
            </>
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="Add new rule..." style={{ ...inp, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && addRule()} />
        <button onClick={addRule} style={{ fontSize: 11, padding: "6px 14px", borderRadius: 4, border: `1px solid ${C.greenBorder}`, background: C.greenBg, color: C.green, cursor: "pointer", fontFamily: font }}>Add</button>
      </div>
    </div>
  );
}

// ─── PATTERN SAVER ────────────────────────────────────────────────────────────
function PatternSaver({ patterns, onUpdate, allTrades }) {
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const addPattern = () => { const p = { id: `p_${Date.now()}`, name: "New Pattern", description: "" }; onUpdate([...patterns, p]); setEditingId(p.id); setNewName(p.name); setNewDesc(""); };
  const saveEdit = (id) => { onUpdate(patterns.map((p) => p.id === id ? { ...p, name: newName, description: newDesc } : p)); setEditingId(null); };
  const deletePattern = (id) => onUpdate(patterns.filter((p) => p.id !== id));

  const getStats = (pid) => {
    const trades = allTrades.filter((t) => t.patternId === pid);
    const total = trades.length;
    const wins = trades.filter(isWin).length;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(0) : null;
    const rrVals = trades.filter((t) => t.actualRR !== "" && t.actualRR !== undefined).map((t) => parseFloat(t.actualRR)).filter((v) => !isNaN(v));
    const avgRR = rrVals.length > 0 ? (rrVals.reduce((a, b) => a + b, 0) / rrVals.length).toFixed(2) : null;
    return { total, wins, winRate, avgRR };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, color: C.textMuted }}>Tag trades to patterns when logging. Stats auto-calculate. Win = TP Hit or Manual Exit with positive RR.</div>
        <button onClick={addPattern} style={{ fontSize: 11, padding: "6px 14px", borderRadius: 4, border: `1px solid ${C.purpleBorder}`, background: C.purpleBg, color: C.purple, cursor: "pointer", fontFamily: font }}>+ New Pattern</button>
      </div>
      {patterns.length === 0 && <div style={{ color: C.textDim, fontSize: 12, padding: 24, textAlign: "center", border: `1px dashed ${C.border}`, borderRadius: 8 }}>No patterns yet.</div>}
      {patterns.map((p) => {
        const { total, wins, winRate, avgRR } = getStats(p.id);
        const isEditing = editingId === p.id;
        return (
          <div key={p.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, background: C.bg2 }}>
            {isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Pattern name..." style={inp} />
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description..." rows={2} style={{ ...inp, resize: "none" }} />
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
                    <button onClick={() => { setEditingId(p.id); setNewName(p.name); setNewDesc(p.description || ""); }} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg3, color: C.textMuted, cursor: "pointer", fontFamily: font }}>Edit</button>
                    <button onClick={() => deletePattern(p.id)} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg3, color: C.textDim, cursor: "pointer", fontFamily: font }}>Delete</button>
                  </div>
                </div>
                {p.description && <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>{p.description}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 10 }}>
                  {[{ label: "Trades", val: total, color: C.text }, { label: "Wins", val: wins, color: C.green }, { label: "Win Rate", val: winRate !== null ? `${winRate}%` : "—", color: winRate !== null && parseInt(winRate) >= 50 ? C.green : C.red }, { label: "Avg RR", val: avgRR !== null ? `${avgRR}R` : "—", color: avgRR !== null && parseFloat(avgRR) > 0 ? C.green : C.red }].map((s) => (
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

// ─── AUTH ─────────────────────────────────────────────────────────────────────
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
      else { setSuccess("Account created. Sign in now."); setMode("signin"); }
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
            {["signin", "signup"].map((m) => <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }} style={{ flex: 1, padding: "8px 0", fontSize: 11, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.1em", border: "none", background: mode === m ? C.border2 : "transparent", color: mode === m ? C.text : C.textMuted, cursor: "pointer" }}>{m === "signin" ? "Sign In" : "Sign Up"}</button>)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label style={lbl}>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handle()} style={inp} /></div>
            <div><label style={lbl}>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handle()} style={inp} /></div>
          </div>
          {error && <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 4, border: `1px solid ${C.redBorder}`, background: C.redBg, color: C.red, fontSize: 11 }}>{error}</div>}
          {success && <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 4, border: `1px solid ${C.greenBorder}`, background: C.greenBg, color: C.green, fontSize: 11 }}>{success}</div>}
          <button onClick={handle} disabled={loading || !email || !password} style={{ marginTop: 16, width: "100%", padding: "10px 0", background: C.border2, border: `1px solid #52525b`, color: C.text, fontSize: 11, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.1em", borderRadius: 4, cursor: loading ? "not-allowed" : "pointer", opacity: (!email || !password) ? 0.4 : 1 }}>
            {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BREAKDOWN TABLE ──────────────────────────────────────────────────────────
function BDTable({ title, items, allTrades, keyFn, color }) {
  const rows = items.map((item) => {
    const trades = allTrades.filter((t) => keyFn(t) === item);
    const total = trades.length;
    const wins = trades.filter(isWin).length;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(0) : null;
    const rrVals = trades.filter((t) => t.actualRR !== "" && t.actualRR !== undefined).map((t) => parseFloat(t.actualRR)).filter((v) => !isNaN(v));
    const avgRR = rrVals.length > 0 ? (rrVals.reduce((a, b) => a + b, 0) / rrVals.length).toFixed(2) : null;
    return { item, total, wins, winRate, avgRR };
  }).filter((r) => r.total > 0);

  if (rows.length === 0) return null;
  return (
    <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "12px 1fr 32px 52px 52px", gap: "4px 8px", alignItems: "center", marginBottom: 6 }}>
        <span /><span style={{ fontSize: 9, color: C.textDim }}>SETUP</span><span style={{ fontSize: 9, color: C.textDim }}>N</span><span style={{ fontSize: 9, color: C.textDim }}>WIN%</span><span style={{ fontSize: 9, color: C.textDim }}>AVG RR</span>
      </div>
      {rows.map((r) => (
        <div key={r.item} style={{ display: "grid", gridTemplateColumns: "12px 1fr 32px 52px 52px", gap: "4px 8px", alignItems: "center", marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color || C.textMuted }} />
          <span style={{ fontSize: 11, color: C.text }}>{r.item}</span>
          <span style={{ fontSize: 11, color: C.textDim }}>{r.total}</span>
          <span style={{ fontSize: 11, color: r.winRate !== null && parseInt(r.winRate) >= 50 ? C.green : C.red }}>{r.winRate !== null ? `${r.winRate}%` : "—"}</span>
          <span style={{ fontSize: 11, color: r.avgRR !== null && parseFloat(r.avgRR) > 0 ? C.green : C.red }}>{r.avgRR !== null ? `${r.avgRR}R` : "—"}</span>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function RCALog() {
  const [session, setSession] = useState(null);
  const [days, setDays] = useState([]);
  const [patterns, setPatterns] = useState(DEFAULT_PATTERNS);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [view, setView] = useState("log");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const existing = supabase.auth.get();
      if (existing?.access_token) { const refreshed = await supabase.auth.refresh(); setSession(refreshed || existing); }
      setLoading(false);
    };
    init();
  }, []);

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const userId = session.user?.id || session.user_id || (session.user && session.user.sub);
    if (!userId) { setDays([defaultDay(DEFAULT_RULES)]); setLoading(false); return; }
    const db = await supabase.db("trades");
    const { data, error } = await db.select(`user_id=eq.${userId}&order=updated_at.desc`);
    if (!error && data && data.length > 0) { setDays(data.map((r) => r.data)); }
    else if (!error) { setDays([defaultDay(DEFAULT_RULES)]); }
    const pdb = await supabase.db("trades");
    const { data: meta } = await pdb.select(`user_id=eq.${userId}_meta`);
    if (meta && meta.length > 0 && meta[0].data) {
      const m = meta[0].data;
      if (m.patterns && m.patterns.length > 0) setPatterns(m.patterns);
      if (m.rules && m.rules.length > 0) setRules(m.rules);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => { if (session) loadData(); }, [session, loadData]);

  const saveData = useCallback(async (daysToSave, patternsToSave, rulesToSave) => {
    if (!session) return;
    setSaveStatus("saving");
    const userId = session.user?.id || session.user_id || (session.user && session.user.sub);
    if (!userId) { setSaveStatus("error"); return; }
    const db = await supabase.db("trades");
    await db.del(`user_id=eq.${userId}`);
    const rows = daysToSave.map((day) => ({ id: day.id, user_id: userId, data: day, updated_at: new Date().toISOString() }));
    rows.push({ id: `${userId}_meta_row`, user_id: `${userId}_meta`, data: { patterns: patternsToSave, rules: rulesToSave }, updated_at: new Date().toISOString() });
    const { error } = await db.upsert(rows);
    setSaveStatus(error ? "error" : "saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [session]);

  useEffect(() => {
    if (!session || days.length === 0) return;
    const timer = setTimeout(() => saveData(days, patterns, rules), 1200);
    return () => clearTimeout(timer);
  }, [days, patterns, rules, session, saveData]);

  const allTrades = days.flatMap((d) => d.trades);
  const total = allTrades.length;
  const wins = allTrades.filter(isWin).length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(0) : null;
  const byExit = (type) => allTrades.filter((t) => t.exitType === type).length;
  const byError = (cls) => allTrades.filter((t) => t.errorClass === cls).length;
  const rrVals = allTrades.filter((t) => t.actualRR !== "" && t.actualRR !== undefined).map((t) => parseFloat(t.actualRR)).filter((v) => !isNaN(v));
  const avgRR = rrVals.length > 0 ? (rrVals.reduce((a, b) => a + b, 0) / rrVals.length).toFixed(2) : null;
  const beWithReason = allTrades.filter((t) => t.exitType === "BE Exit" && t.beReason);
  const ruleAdherenceAll = rules.length > 0 ? Math.round(allTrades.reduce((acc, t) => { const followed = rules.filter((r) => t.ruleAdherence?.[r.id]).length; return acc + (followed / rules.length) * 100; }, 0) / Math.max(allTrades.length, 1)) : null;
  const handleSignOut = async () => { await supabase.auth.signOut(); setSession(null); setDays([]); };

  if (loading && !session) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: C.textDim, fontSize: 12, fontFamily: font }}>loading...</span></div>;
  if (!session) return <AuthScreen onAuth={(s) => setSession(s)} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: font }}>
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
          {["log", "summary", "patterns", "rules"].map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 4, border: `1px solid ${view === v ? "#52525b" : C.border}`, background: view === v ? C.border2 : C.bg2, color: view === v ? C.text : C.textMuted, cursor: "pointer", fontFamily: font, letterSpacing: "0.05em", textTransform: "uppercase" }}>{v}</button>
          ))}
          <button onClick={handleSignOut} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg2, color: C.textDim, cursor: "pointer", fontFamily: font }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
        {loading ? <div style={{ color: C.textDim, fontSize: 12, textAlign: "center", padding: 60 }}>Loading your logs...</div>

        : view === "log" ? (
          <>
            {days.map((day) => <DayBlock key={day.id} day={day} onUpdate={(u) => setDays(days.map((d) => d.id === u.id ? u : d))} onDelete={(id) => setDays(days.filter((d) => d.id !== id))} patterns={patterns} rules={rules} />)}
            <button onClick={() => setDays([...days, defaultDay(rules)])} style={{ width: "100%", padding: 12, border: `1px dashed ${C.border}`, borderRadius: 6, background: "transparent", color: C.textMuted, fontSize: 13, fontFamily: font, cursor: "pointer" }}>+ Add New Day</button>
          </>

        ) : view === "patterns" ? (
          <PatternSaver patterns={patterns} onUpdate={setPatterns} allTrades={allTrades} />

        ) : view === "rules" ? (
          <RulesManager rules={rules} onUpdate={setRules} />

        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* TOP STATS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12 }}>
              {[
                { label: "Total Trades", val: total, color: C.text },
                { label: "Wins", val: wins, color: C.green },
                { label: "Win Rate", val: winRate !== null ? `${winRate}%` : "—", color: winRate !== null && parseInt(winRate) >= 50 ? C.green : C.red },
                { label: "TP Hit", val: byExit("TP Hit"), color: C.green },
                { label: "SL Hit", val: byExit("SL Hit"), color: C.red },
                { label: "BE Exit", val: byExit("BE Exit"), color: C.yellow },
                { label: "Avg RR", val: avgRR !== null ? `${avgRR}R` : "—", color: avgRR !== null && parseFloat(avgRR) > 0 ? C.green : C.red },
                { label: "Rule Adherence", val: ruleAdherenceAll !== null ? `${ruleAdherenceAll}%` : "—", color: C.blue },
              ].map((s) => (
                <div key={s.label} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 22, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* CONDITIONAL EDGE */}
            <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.12em", padding: "8px 0 4px", borderBottom: `1px solid ${C.border}` }}>Conditional Edge Analysis</div>

            <BDTable title="By Phase at Entry" items={PHASES} allTrades={allTrades} keyFn={(t) => t.phase} color={C.yellow} />
            <BDTable title="By Primary Mechanism" items={MECHANISMS} allTrades={allTrades} keyFn={(t) => t.primaryMechanism} color={C.orange} />
            <BDTable title="By Entry Location (Single)" items={LOCATIONS} allTrades={allTrades} keyFn={(t) => (t.locations && t.locations.length === 1) ? t.locations[0] : null} color={C.blue} />
            <BDTable title="By Current Distribution" items={DISTRIBUTIONS} allTrades={allTrades} keyFn={(t) => t.distributionCurrent} color={C.textMuted} />
            <BDTable title="By Day Type" items={DAY_TYPES} allTrades={allTrades} keyFn={(t) => { const day = days.find((d) => d.trades.some((tr) => tr.id === t.id)); return day ? day.dayType : null; }} color={C.textMuted} />
            <BDTable title="By Confirmation Signal (Primary)" items={CONFIRMATION_SIGNALS} allTrades={allTrades} keyFn={(t) => { const active = CONFIRMATION_SIGNALS.filter((s) => t.signals?.[s]); return active.length === 1 ? active[0] : null; }} color={C.green} />

            {/* ERROR */}
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Error Classification</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ERROR_CLASSES.map((cls) => {
                  const count = byError(cls);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  const barColor = { "Valid Loss": C.greenBorder, "Model Error": C.redBorder, "Execution Error": C.yellowBorder, "Read Error": C.blueBorder, "Environment Mismatch": C.redBorder, "Confirmation Addiction": C.purpleBorder }[cls] || C.textDim;
                  return (
                    <div key={cls} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 11, color: C.textMuted, width: 170, flexShrink: 0 }}>{cls}</div>
                      <div style={{ flex: 1, background: C.border, borderRadius: 4, height: 4 }}><div style={{ width: `${pct}%`, height: 4, borderRadius: 4, background: barColor }} /></div>
                      <div style={{ fontSize: 11, color: C.textMuted, width: 20, textAlign: "right" }}>{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BE */}
            {byExit("BE Exit") > 0 && (
              <div style={{ background: C.bg2, border: `1px solid ${C.yellowBorder}`, borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 10, color: C.yellow, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>BE Exit Breakdown</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {BE_REASONS.map((r) => { const count = beWithReason.filter((t) => t.beReason === r).length; return count > 0 ? <div key={r} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px" }}><div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>{r}</div><div style={{ fontSize: 18, color: r === "Legitimate Read" ? C.green : C.yellow }}>{count}</div></div> : null; })}
                  {beWithReason.length === 0 && <div style={{ fontSize: 11, color: C.textDim }}>No BE reasons logged yet.</div>}
                </div>
              </div>
            )}

            {/* RULES ADHERENCE PER RULE */}
            {rules.length > 0 && (
              <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Rules Adherence Breakdown</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {rules.map((r) => {
                    const followed = allTrades.filter((t) => t.ruleAdherence?.[r.id]).length;
                    const pct = allTrades.length > 0 ? (followed / allTrades.length) * 100 : 0;
                    return (
                      <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ fontSize: 11, color: C.textMuted, flex: 1 }}>{r.text}</div>
                        <div style={{ width: 80, background: C.border, borderRadius: 4, height: 4, flexShrink: 0 }}><div style={{ width: `${pct}%`, height: 4, borderRadius: 4, background: pct >= 80 ? C.greenBorder : pct >= 50 ? C.yellowBorder : C.redBorder }} /></div>
                        <div style={{ fontSize: 11, color: C.textMuted, width: 32, textAlign: "right", flexShrink: 0 }}>{Math.round(pct)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CORRECTIVE RULES */}
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Corrective Rules Generated</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {allTrades.filter((t) => t.correctiveRuleGenerated).map((t) => <div key={t.id} style={{ fontSize: 11, borderLeft: `2px solid ${C.redBorder}`, paddingLeft: 12, color: C.red }}>{t.correctiveRuleGenerated}</div>)}
                {allTrades.filter((t) => t.correctiveRuleGenerated).length === 0 && <div style={{ fontSize: 11, color: C.textDim }}>No rules generated yet.</div>}
              </div>
            </div>

            {/* CORRECTIVE ACTIONS */}
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Recent Corrective Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {allTrades.filter((t) => t.correctiveAction).slice(-5).reverse().map((t) => <div key={t.id} style={{ display: "flex", gap: 12, fontSize: 11, borderLeft: `2px solid ${C.border}`, paddingLeft: 12 }}><span style={{ color: t.direction === "Long" ? C.green : C.red, flexShrink: 0 }}>{t.direction}</span><span style={{ color: "#d4d4d8" }}>{t.correctiveAction}</span></div>)}
                {allTrades.filter((t) => t.correctiveAction).length === 0 && <div style={{ fontSize: 11, color: C.textDim }}>No corrective actions logged yet.</div>}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
