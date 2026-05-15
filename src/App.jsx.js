import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://oowtwcmfczhmunbsamjt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vd3R3Y21mY3pobXVuYnNhbWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NzMxMDUsImV4cCI6MjA5NDM0OTEwNX0.Y56mkz7wV6q1U0DqE8FhoBYCD_n1W0GNnwuXohLLol4";

const supabase = {
  _headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
  auth: {
    _session: null,
    async signUp(email, password) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (data.access_token) { this._session = data; localStorage.setItem("sb_session", JSON.stringify(data)); }
      return { data, error: data.error || null };
    },
    async signIn(email, password) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (data.access_token) { this._session = data; localStorage.setItem("sb_session", JSON.stringify(data)); }
      return { data, error: data.error_description || data.error || null };
    },
    async signOut() {
      const session = this.getSession();
      if (session) { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${session.access_token}` } }); }
      this._session = null; localStorage.removeItem("sb_session");
    },
    getSession() {
      if (this._session) return this._session;
      const stored = localStorage.getItem("sb_session");
      if (stored) { this._session = JSON.parse(stored); return this._session; }
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

const INSTRUMENTS = ["NQ", "ES", "CL", "GC", "Other"];
const DIRECTIONS = ["Long", "Short"];
const REGIMES = ["Trending", "Rotational", "Mixed/Choppy", "Gap/Open Drive", "Unclear"];
const EXIT_TYPES = ["SL Hit", "BE Exit", "TP Hit", "Manual Exit"];
const ERROR_CLASSES = ["Valid Loss", "Model Error", "Execution Error", "Read Error", "Regime Misread"];
const ENTRY_CRITERIA = ["PBD Structure Confirmed", "LAT Context Aligned", "Auction Imbalance Present", "Volume Confirms Aggression", "Timing (NY Open Window)", "Opposite Side Not Absorbing"];

const defaultTrade = () => ({ id: `t_${Date.now()}_${Math.random().toString(36).slice(2)}`, time: "", instrument: "NQ", direction: "Long", regime: "", entryCriteria: {}, executionQuality: "", exitType: "", exitReason: "", errorClass: "", correctiveAction: "", notes: "" });
const defaultDay = () => ({ id: `d_${Date.now()}_${Math.random().toString(36).slice(2)}`, date: new Date().toISOString().split("T")[0], trades: [defaultTrade()] });

const C = {
  bg: "#09090b", bg2: "#111113", bg3: "#18181b", border: "#27272a", border2: "#3f3f46",
  text: "#e4e4e7", textMuted: "#71717a", textDim: "#52525b",
  green: "#6ee7b7", greenBg: "rgba(6,78,59,0.4)", greenBorder: "#059669",
  red: "#fca5a5", redBg: "rgba(127,29,29,0.4)", redBorder: "#dc2626",
  yellow: "#fcd34d", yellowBg: "rgba(113,63,18,0.4)", yellowBorder: "#d97706",
  blue: "#93c5fd", blueBg: "rgba(30,58,138,0.4)", blueBorder: "#2563eb",
};

const font = "'IBM Plex Mono', 'Courier New', monospace";

const chipStyle = (active, color) => {
  const map = { green: [C.greenBg, C.greenBorder, C.green], red: [C.redBg, C.redBorder, C.red], yellow: [C.yellowBg, C.yellowBorder, C.yellow], blue: [C.blueBg, C.blueBorder, C.blue] };
  const [bg, border, text] = active ? (map[color] || ["#27272a", C.border2, C.text]) : ["#18181b", C.border, C.textMuted];
  return { fontSize: 11, padding: "6px 10px", borderRadius: 4, border: `1px solid ${border}`, background: bg, color: text, cursor: "pointer", fontFamily: font };
};

const badgeStyle = (color) => {
  const map = { green: [C.greenBg, C.greenBorder, C.green], red: [C.redBg, C.redBorder, C.red], yellow: [C.yellowBg, C.yellowBorder, C.yellow], blue: [C.blueBg, C.blueBorder, C.blue], gray: ["#27272a", C.border2, C.textMuted] };
  const [bg, border, text] = map[color] || map.gray;
  return { fontSize: 10, padding: "2px 6px", borderRadius: 4, border: `1px solid ${border}`, background: bg, color: text, fontFamily: font, letterSpacing: "0.05em" };
};

const inputStyle = { width: "100%", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 8px", color: C.text, fontSize: 13, fontFamily: font, outline: "none", boxSizing: "border-box" };
const labelStyle = { display: "block", fontSize: 10, color: C.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" };

const exitColor = (t) => ({ "TP Hit": "green", "SL Hit": "red", "BE Exit": "yellow" }[t] || "gray");
const errorColor = (c) => ({ "Valid Loss": "green", "Model Error": "red", "Regime Misread": "red", "Execution Error": "yellow", "Read Error": "blue" }[c] || "gray");

function TradeCard({ trade, onUpdate, onDelete, index }) {
  const [open, setOpen] = useState(true);
  const update = (f, v) => onUpdate({ ...trade, [f]: v });
  const toggleCriteria = (c) => onUpdate({ ...trade, entryCriteria: { ...trade.entryCriteria, [c]: !trade.entryCriteria[c] } });
  const metCount = ENTRY_CRITERIA.filter((c) => trade.entryCriteria[c]).length;

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 12, background: C.bg2 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: C.bg3, cursor: "pointer", flexWrap: "wrap", gap: 8 }} onClick={() => setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ color: C.textDim, fontSize: 11 }}>#{String(index + 1).padStart(2, "0")}</span>
          <span style={{ color: C.text, fontSize: 13 }}>{trade.time || "??:??"}</span>
          <span style={{ color: trade.direction === "Long" ? C.green : C.red, fontSize: 11, fontWeight: "bold" }}>{trade.direction}</span>
          <span style={{ color: C.textMuted, fontSize: 11 }}>{trade.instrument}</span>
          {trade.exitType && <span style={badgeStyle(exitColor(trade.exitType))}>{trade.exitType}</span>}
          {trade.errorClass && <span style={badgeStyle(errorColor(trade.errorClass))}>{trade.errorClass}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: C.textDim, fontSize: 11 }}>{metCount}/{ENTRY_CRITERIA.length}</span>
          <button onClick={(e) => { e.stopPropagation(); onDelete(trade.id); }} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 12 }}>✕</button>
          <span style={{ color: C.textDim, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
            <div><label style={labelStyle}>Time</label><input type="time" value={trade.time} onChange={(e) => update("time", e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Instrument</label><select value={trade.instrument} onChange={(e) => update("instrument", e.target.value)} style={inputStyle}>{INSTRUMENTS.map((i) => <option key={i}>{i}</option>)}</select></div>
            <div>
              <label style={labelStyle}>Direction</label>
              <div style={{ display: "flex", gap: 6 }}>
                {DIRECTIONS.map((d) => <button key={d} onClick={() => update("direction", d)} style={{ ...chipStyle(trade.direction === d, d === "Long" ? "green" : "red"), flex: 1 }}>{d}</button>)}
              </div>
            </div>
            <div><label style={labelStyle}>Regime</label><select value={trade.regime} onChange={(e) => update("regime", e.target.value)} style={inputStyle}><option value="">Select...</option>{REGIMES.map((r) => <option key={r}>{r}</option>)}</select></div>
          </div>

          <div>
            <label style={labelStyle}>Entry Criteria Met</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ENTRY_CRITERIA.map((c) => <button key={c} onClick={() => toggleCriteria(c)} style={chipStyle(trade.entryCriteria[c], "green")}>{trade.entryCriteria[c] ? "✓ " : ""}{c}</button>)}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Execution Quality</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Clean", "Late", "Early", "Sized Wrong", "Hesitated"].map((q) => <button key={q} onClick={() => update("executionQuality", trade.executionQuality === q ? "" : q)} style={chipStyle(trade.executionQuality === q, "blue")}>{q}</button>)}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Exit Type</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EXIT_TYPES.map((e) => <button key={e} onClick={() => update("exitType", trade.exitType === e ? "" : e)} style={chipStyle(trade.exitType === e, exitColor(e))}>{e}</button>)}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Error Classification</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ERROR_CLASSES.map((e) => <button key={e} onClick={() => update("errorClass", trade.errorClass === e ? "" : e)} style={chipStyle(trade.errorClass === e, errorColor(e))}>{e}</button>)}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={labelStyle}>Exit Trigger / What Happened</label><textarea value={trade.exitReason} onChange={(e) => update("exitReason", e.target.value)} rows={2} placeholder="e.g. Opposite side absorbed at HOD..." style={{ ...inputStyle, resize: "none" }} /></div>
            <div><label style={labelStyle}>Corrective Action</label><textarea value={trade.correctiveAction} onChange={(e) => update("correctiveAction", e.target.value)} rows={2} placeholder="e.g. Wait for absorption confirmation..." style={{ ...inputStyle, resize: "none" }} /></div>
          </div>

          <div><label style={labelStyle}>Additional Notes</label><textarea value={trade.notes} onChange={(e) => update("notes", e.target.value)} rows={1} placeholder="Context, observations..." style={{ ...inputStyle, resize: "none" }} /></div>
        </div>
      )}
    </div>
  );
}

function DayBlock({ day, onUpdate, onDelete }) {
  const addTrade = () => onUpdate({ ...day, trades: [...day.trades, defaultTrade()] });
  const updateTrade = (u) => onUpdate({ ...day, trades: day.trades.map((t) => t.id === u.id ? u : t) });
  const deleteTrade = (id) => onUpdate({ ...day, trades: day.trades.filter((t) => t.id !== id) });
  const tp = day.trades.filter((t) => t.exitType === "TP Hit").length;
  const sl = day.trades.filter((t) => t.exitType === "SL Hit").length;
  const be = day.trades.filter((t) => t.exitType === "BE Exit").length;

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.text, fontSize: 14 }}>{day.date || "No Date"}</span>
            <input type="date" value={day.date} onChange={(e) => onUpdate({ ...day, date: e.target.value })} style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, color: C.textMuted, fontSize: 11, fontFamily: font, outline: "none" }} />
          </div>
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
      <div style={{ borderLeft: `2px solid ${C.border}`, paddingLeft: 16 }}>
        {day.trades.length === 0 && <div style={{ color: C.textDim, fontSize: 12, padding: 16, textAlign: "center", border: `1px dashed ${C.border}`, borderRadius: 6 }}>No trades logged. Add one above.</div>}
        {day.trades.map((trade, i) => <TradeCard key={trade.id} trade={trade} index={i} onUpdate={updateTrade} onDelete={deleteTrade} />)}
      </div>
    </div>
  );
}

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

export default function RCALog() {
  const [session, setSession] = useState(null);
  const [days, setDays] = useState([]);
  const [view, setView] = useState("log");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existing = supabase.auth.getSession();
    if (existing?.access_token) { setSession(existing); }
    setLoading(false);
  }, []);

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const db = await supabase.from("trades");
    const userId = session.user?.id;
    const { data, error } = await db.select(`user_id=eq.${userId}&order=updated_at.desc`);
    if (!error && data && data.length > 0) { setDays(data.map((row) => row.data)); }
    else if (!error && (!data || data.length === 0)) { setDays([defaultDay()]); }
    setLoading(false);
  }, [session]);

  useEffect(() => { if (session) loadData(); }, [session, loadData]);

  const saveData = useCallback(async (daysToSave) => {
    if (!session) return;
    setSaveStatus("saving");
    const userId = session.user?.id;
    const db = await supabase.from("trades");
    await db.delete(`user_id=eq.${userId}`);
    const rows = daysToSave.map((day) => ({ id: day.id, user_id: userId, data: day, updated_at: new Date().toISOString() }));
    if (rows.length > 0) { const { error } = await db.upsert(rows); setSaveStatus(error ? "error" : "saved"); }
    else { setSaveStatus("saved"); }
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [session]);

  useEffect(() => {
    if (!session || days.length === 0) return;
    const timer = setTimeout(() => saveData(days), 1200);
    return () => clearTimeout(timer);
  }, [days, session, saveData]);

  const addDay = () => setDays([...days, defaultDay()]);
  const updateDay = (u) => setDays(days.map((d) => d.id === u.id ? u : d));
  const deleteDay = (id) => setDays(days.filter((d) => d.id !== id));
  const allTrades = days.flatMap((d) => d.trades);
  const byExit = (type) => allTrades.filter((t) => t.exitType === type).length;
  const byError = (cls) => allTrades.filter((t) => t.errorClass === cls).length;
  const total = allTrades.length;
  const handleSignOut = async () => { await supabase.auth.signOut(); setSession(null); setDays([]); };

  if (loading && !session) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: C.textDim, fontSize: 12, fontFamily: font }}>loading...</span></div>;
  if (!session) return <AuthScreen onAuth={(s) => setSession(s)} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: font }}>
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(9,9,11,0.95)", zIndex: 10, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text }}>PBD/LAT · RCA Log</div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
            Root Cause Analysis — NY Session
            {saveStatus === "saving" && <span style={{ color: C.textMuted, marginLeft: 8 }}>· saving...</span>}
            {saveStatus === "saved" && <span style={{ color: C.greenBorder, marginLeft: 8 }}>· saved ✓</span>}
            {saveStatus === "error" && <span style={{ color: C.redBorder, marginLeft: 8 }}>· save failed</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["log", "summary"].map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 4, border: `1px solid ${view === v ? "#52525b" : C.border}`, background: view === v ? C.border2 : C.bg2, color: view === v ? C.text : C.textMuted, cursor: "pointer", fontFamily: font, letterSpacing: "0.05em", textTransform: "uppercase" }}>{v}</button>
          ))}
          <button onClick={handleSignOut} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg2, color: C.textDim, cursor: "pointer", fontFamily: font }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        {loading ? <div style={{ color: C.textDim, fontSize: 12, textAlign: "center", padding: 60 }}>Loading your logs...</div>
        : view === "log" ? (
          <>
            {days.map((day) => <DayBlock key={day.id} day={day} onUpdate={updateDay} onDelete={deleteDay} />)}
            <button onClick={addDay} style={{ width: "100%", padding: 12, border: `1px dashed ${C.border}`, borderRadius: 6, background: "transparent", color: C.textMuted, fontSize: 13, fontFamily: font, cursor: "pointer" }}>+ Add New Day</button>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
              {[{ label: "Total Trades", val: total, color: C.text }, { label: "TP Hit", val: byExit("TP Hit"), color: C.green }, { label: "SL Hit", val: byExit("SL Hit"), color: C.red }, { label: "BE Exit", val: byExit("BE Exit"), color: C.yellow }].map((stat) => (
                <div key={stat.label} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontSize: 32, color: stat.color }}>{stat.val}</div>
                  {total > 0 && stat.label !== "Total Trades" && <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{((stat.val / total) * 100).toFixed(0)}%</div>}
                </div>
              ))}
            </div>
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Error Classification Breakdown</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ERROR_CLASSES.map((cls) => {
                  const count = byError(cls);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  const barColor = { "Valid Loss": C.greenBorder, "Model Error": C.redBorder, "Execution Error": C.yellowBorder, "Read Error": C.blueBorder, "Regime Misread": "#7c3aed" }[cls] || C.textDim;
                  return (
                    <div key={cls} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 11, color: C.textMuted, width: 130 }}>{cls}</div>
                      <div style={{ flex: 1, background: C.border, borderRadius: 4, height: 4 }}><div style={{ width: `${pct}%`, height: 4, borderRadius: 4, background: barColor }} /></div>
                      <div style={{ fontSize: 11, color: C.textMuted, width: 20, textAlign: "right" }}>{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Recent Corrective Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {allTrades.filter((t) => t.correctiveAction).slice(-5).reverse().map((t) => (
                  <div key={t.id} style={{ display: "flex", gap: 12, fontSize: 11, borderLeft: `2px solid ${C.border}`, paddingLeft: 12 }}>
                    <span style={{ color: t.direction === "Long" ? C.green : C.red }}>{t.direction}</span>
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
