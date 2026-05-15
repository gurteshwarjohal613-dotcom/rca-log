import { useState, useEffect, useCallback } from "react";

// ─── SUPABASE CONFIG ───────────────────────────────────────────────────────────
const SUPABASE_URL = "https://oowtwcmfczhmunbsamjt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vd3R3Y21mY3pobXVuYnNhbWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NzMxMDUsImV4cCI6MjA5NDM0OTEwNX0.Y56mkz7wV6q1U0DqE8FhoBYCD_n1W0GNnwuXohLLol4";

// Minimal Supabase client — no npm package needed
const supabase = {
  _headers: {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  },

  auth: {
    _session: null,
    async signUp(email, password) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        this._session = data;
        localStorage.setItem("sb_session", JSON.stringify(data));
      }
      return { data, error: data.error || null };
    },
    async signIn(email, password) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        this._session = data;
        localStorage.setItem("sb_session", JSON.stringify(data));
      }
      return { data, error: data.error_description || data.error || null };
    },
    async signOut() {
      const session = this.getSession();
      if (session) {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${session.access_token}` },
        });
      }
      this._session = null;
      localStorage.removeItem("sb_session");
    },
    getSession() {
      if (this._session) return this._session;
      const stored = localStorage.getItem("sb_session");
      if (stored) {
        this._session = JSON.parse(stored);
        return this._session;
      }
      return null;
    },
  },

  async from(table) {
    const session = supabase.auth.getSession();
    const authHeader = session ? `Bearer ${session.access_token}` : `Bearer ${SUPABASE_ANON_KEY}`;
    return {
      async select(filter = "") {
        const url = `${SUPABASE_URL}/rest/v1/${table}${filter ? "?" + filter : ""}`;
        const res = await fetch(url, {
          headers: { ...supabase._headers, "Authorization": authHeader },
        });
        const data = await res.json();
        return { data, error: res.ok ? null : data };
      },
      async upsert(body) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: "POST",
          headers: { ...supabase._headers, "Authorization": authHeader, "Prefer": "resolution=merge-duplicates" },
          body: JSON.stringify(body),
        });
        const text = await res.text();
        return { error: res.ok ? null : text };
      },
      async delete(filter = "") {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
          method: "DELETE",
          headers: { ...supabase._headers, "Authorization": authHeader },
        });
        return { error: res.ok ? null : await res.text() };
      },
    };
  },
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const INSTRUMENTS = ["NQ", "ES", "CL", "GC", "Other"];
const DIRECTIONS = ["Long", "Short"];
const REGIMES = ["Trending", "Rotational", "Mixed/Choppy", "Gap/Open Drive", "Unclear"];
const EXIT_TYPES = ["SL Hit", "BE Exit", "TP Hit", "Manual Exit"];
const ERROR_CLASSES = ["Valid Loss", "Model Error", "Execution Error", "Read Error", "Regime Misread"];
const ENTRY_CRITERIA = [
  "PBD Structure Confirmed",
  "LAT Context Aligned",
  "Auction Imbalance Present",
  "Volume Confirms Aggression",
  "Timing (NY Open Window)",
  "Opposite Side Not Absorbing",
];

const defaultTrade = () => ({
  id: `t_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  time: "",
  instrument: "NQ",
  direction: "Long",
  regime: "",
  entryCriteria: {},
  executionQuality: "",
  exitType: "",
  exitReason: "",
  errorClass: "",
  correctiveAction: "",
  notes: "",
});

const defaultDay = () => ({
  id: `d_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  date: new Date().toISOString().split("T")[0],
  trades: [defaultTrade()],
});

// ─── BADGE ────────────────────────────────────────────────────────────────────
const Badge = ({ label, color }) => {
  const colors = {
    green: "bg-emerald-900/60 text-emerald-300 border-emerald-700",
    red: "bg-red-900/60 text-red-300 border-red-700",
    yellow: "bg-yellow-900/60 text-yellow-300 border-yellow-700",
    blue: "bg-blue-900/60 text-blue-300 border-blue-700",
    gray: "bg-zinc-800 text-zinc-400 border-zinc-600",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-mono tracking-wide ${colors[color] || colors.gray}`}>
      {label}
    </span>
  );
};

const exitColor = (t) => ({ "TP Hit": "green", "SL Hit": "red", "BE Exit": "yellow" }[t] || "gray");
const errorColor = (c) => ({ "Valid Loss": "green", "Model Error": "red", "Regime Misread": "red", "Execution Error": "yellow", "Read Error": "blue" }[c] || "gray");

// ─── TRADE CARD ───────────────────────────────────────────────────────────────
function TradeCard({ trade, onUpdate, onDelete, index }) {
  const [open, setOpen] = useState(true);
  const update = (field, val) => onUpdate({ ...trade, [field]: val });
  const toggleCriteria = (c) =>
    onUpdate({ ...trade, entryCriteria: { ...trade.entryCriteria, [c]: !trade.entryCriteria[c] } });
  const metCount = ENTRY_CRITERIA.filter((c) => trade.entryCriteria[c]).length;

  return (
    <div className="border border-zinc-700/60 rounded-lg overflow-hidden mb-3 bg-zinc-900/80 backdrop-blur-sm">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer bg-zinc-800/60 hover:bg-zinc-800 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-zinc-500 font-mono text-xs">#{String(index + 1).padStart(2, "0")}</span>
          <span className="text-zinc-200 font-mono text-sm">{trade.time || "??:??"}</span>
          <span className={`text-xs font-bold ${trade.direction === "Long" ? "text-emerald-400" : "text-red-400"}`}>{trade.direction}</span>
          <span className="text-zinc-400 text-xs">{trade.instrument}</span>
          {trade.exitType && <Badge label={trade.exitType} color={exitColor(trade.exitType)} />}
          {trade.errorClass && <Badge label={trade.errorClass} color={errorColor(trade.errorClass)} />}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-zinc-600 text-xs font-mono">{metCount}/{ENTRY_CRITERIA.length}</span>
          <button onClick={(e) => { e.stopPropagation(); onDelete(trade.id); }} className="text-zinc-600 hover:text-red-400 text-xs transition-colors px-1">✕</button>
          <span className="text-zinc-500 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div className="p-4 grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-zinc-500 text-xs mb-1 uppercase tracking-widest">Time</label>
              <input type="time" value={trade.time} onChange={(e) => update("time", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-sm font-mono focus:outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="block text-zinc-500 text-xs mb-1 uppercase tracking-widest">Instrument</label>
              <select value={trade.instrument} onChange={(e) => update("instrument", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-sm focus:outline-none focus:border-zinc-500">
                {INSTRUMENTS.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-zinc-500 text-xs mb-1 uppercase tracking-widest">Direction</label>
              <div className="flex gap-2">
                {DIRECTIONS.map((d) => (
                  <button key={d} onClick={() => update("direction", d)}
                    className={`flex-1 py-1.5 rounded text-sm font-bold transition-colors border ${trade.direction === d
                      ? d === "Long" ? "bg-emerald-900 border-emerald-600 text-emerald-300" : "bg-red-900 border-red-700 text-red-300"
                      : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-zinc-500 text-xs mb-1 uppercase tracking-widest">Regime</label>
              <select value={trade.regime} onChange={(e) => update("regime", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-sm focus:outline-none focus:border-zinc-500">
                <option value="">Select...</option>
                {REGIMES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-500 text-xs mb-2 uppercase tracking-widest">Entry Criteria Met</label>
            <div className="flex flex-wrap gap-2">
              {ENTRY_CRITERIA.map((c) => (
                <button key={c} onClick={() => toggleCriteria(c)}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors ${trade.entryCriteria[c]
                    ? "bg-emerald-900/50 border-emerald-600 text-emerald-300"
                    : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                  {trade.entryCriteria[c] ? "✓ " : ""}{c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-zinc-500 text-xs mb-1 uppercase tracking-widest">Execution Quality</label>
            <div className="flex flex-wrap gap-2">
              {["Clean", "Late", "Early", "Sized Wrong", "Hesitated"].map((q) => (
                <button key={q} onClick={() => update("executionQuality", trade.executionQuality === q ? "" : q)}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors ${trade.executionQuality === q
                    ? "bg-blue-900/50 border-blue-600 text-blue-300"
                    : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-500 text-xs mb-1 uppercase tracking-widest">Exit Type</label>
              <div className="flex flex-wrap gap-2">
                {EXIT_TYPES.map((e) => (
                  <button key={e} onClick={() => update("exitType", trade.exitType === e ? "" : e)}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors ${trade.exitType === e
                      ? e === "TP Hit" ? "bg-emerald-900/50 text-emerald-300 border-emerald-600"
                        : e === "SL Hit" ? "bg-red-900/50 text-red-300 border-red-700"
                        : e === "BE Exit" ? "bg-yellow-900/50 text-yellow-300 border-yellow-700"
                        : "bg-zinc-700 text-zinc-200 border-zinc-500"
                      : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-zinc-500 text-xs mb-1 uppercase tracking-widest">Error Classification</label>
              <div className="flex flex-wrap gap-2">
                {ERROR_CLASSES.map((e) => (
                  <button key={e} onClick={() => update("errorClass", trade.errorClass === e ? "" : e)}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors ${trade.errorClass === e
                      ? "bg-zinc-600 border-zinc-400 text-zinc-100"
                      : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-500 text-xs mb-1 uppercase tracking-widest">Exit Trigger / What Happened</label>
              <textarea value={trade.exitReason} onChange={(e) => update("exitReason", e.target.value)} rows={2}
                placeholder="e.g. Opposite side absorbed at HOD, flow reversed..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none" />
            </div>
            <div>
              <label className="block text-zinc-500 text-xs mb-1 uppercase tracking-widest">Corrective Action</label>
              <textarea value={trade.correctiveAction} onChange={(e) => update("correctiveAction", e.target.value)} rows={2}
                placeholder="e.g. Wait for absorption confirmation before entry..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none" />
            </div>
          </div>

          <div>
            <label className="block text-zinc-500 text-xs mb-1 uppercase tracking-widest">Additional Notes</label>
            <textarea value={trade.notes} onChange={(e) => update("notes", e.target.value)} rows={1}
              placeholder="Context, observations, chart notes..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DAY BLOCK ────────────────────────────────────────────────────────────────
function DayBlock({ day, onUpdate, onDelete }) {
  const addTrade = () => onUpdate({ ...day, trades: [...day.trades, defaultTrade()] });
  const updateTrade = (updated) => onUpdate({ ...day, trades: day.trades.map((t) => t.id === updated.id ? updated : t) });
  const deleteTrade = (id) => onUpdate({ ...day, trades: day.trades.filter((t) => t.id !== id) });

  const tpCount = day.trades.filter((t) => t.exitType === "TP Hit").length;
  const slCount = day.trades.filter((t) => t.exitType === "SL Hit").length;
  const beCount = day.trades.filter((t) => t.exitType === "BE Exit").length;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-zinc-300 font-mono text-base tracking-wide">{day.date || "No Date"}</span>
            <input type="date" value={day.date} onChange={(e) => onUpdate({ ...day, date: e.target.value })}
              className="bg-transparent border-b border-zinc-700 text-zinc-500 text-xs focus:outline-none focus:border-zinc-400 font-mono" />
          </div>
          <div className="flex gap-2 text-xs font-mono">
            {tpCount > 0 && <span className="text-emerald-400">TP×{tpCount}</span>}
            {slCount > 0 && <span className="text-red-400">SL×{slCount}</span>}
            {beCount > 0 && <span className="text-yellow-400">BE×{beCount}</span>}
            <span className="text-zinc-600">{day.trades.length} trade{day.trades.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={addTrade}
            className="text-xs px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded hover:border-zinc-500 hover:text-zinc-200 transition-colors font-mono">
            + Add Trade
          </button>
          <button onClick={() => onDelete(day.id)}
            className="text-xs px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-600 rounded hover:border-red-800 hover:text-red-400 transition-colors font-mono">
            Delete Day
          </button>
        </div>
      </div>
      <div className="border-l-2 border-zinc-800 pl-4">
        {day.trades.length === 0 && (
          <div className="text-zinc-600 text-sm font-mono py-4 text-center border border-dashed border-zinc-800 rounded">
            No trades logged. Add one above.
          </div>
        )}
        {day.trades.map((trade, i) => (
          <TradeCard key={trade.id} trade={trade} index={i} onUpdate={updateTrade} onDelete={deleteTrade} />
        ))}
      </div>
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handle = async () => {
    setError(""); setSuccess(""); setLoading(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp(email, password);
      if (error) { setError(error); }
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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');`}</style>
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="text-zinc-200 font-mono text-sm tracking-widest uppercase mb-1">PBD/LAT · RCA Log</div>
          <div className="text-zinc-600 text-xs">Root Cause Analysis — NY Session</div>
        </div>

        <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900/60">
          <div className="flex mb-6 border border-zinc-800 rounded overflow-hidden">
            {["signin", "signup"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 text-xs font-mono uppercase tracking-widest transition-colors ${mode === m ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}>
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-zinc-500 text-xs mb-1 uppercase tracking-widest">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handle()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-200 text-sm font-mono focus:outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="block text-zinc-500 text-xs mb-1 uppercase tracking-widest">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handle()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-200 text-sm font-mono focus:outline-none focus:border-zinc-500" />
            </div>
          </div>

          {error && <div className="mt-3 text-red-400 text-xs font-mono border border-red-900/50 rounded px-3 py-2 bg-red-950/30">{error}</div>}
          {success && <div className="mt-3 text-emerald-400 text-xs font-mono border border-emerald-900/50 rounded px-3 py-2 bg-emerald-950/30">{success}</div>}

          <button onClick={handle} disabled={loading || !email || !password}
            className="mt-4 w-full py-2.5 bg-zinc-700 border border-zinc-600 text-zinc-200 text-xs font-mono uppercase tracking-widest rounded hover:bg-zinc-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </div>

        {mode === "signup" && (
          <div className="mt-4 text-zinc-600 text-xs font-mono text-center">
            Use any email + password (min 6 chars).<br />This account is private to you only.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function RCALog() {
  const [session, setSession] = useState(null);
  const [days, setDays] = useState([]);
  const [view, setView] = useState("log");
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const existing = supabase.auth.getSession();
    if (existing?.access_token) {
      setSession(existing);
    }
    setLoading(false);
  }, []);

  // Load data when session exists
  useEffect(() => {
    if (!session) return;
    loadData();
  }, [session]);

  const loadData = async () => {
    setLoading(true);
    const db = await supabase.from("trades");
    const userId = session.user?.id;
    const { data, error } = await db.select(`user_id=eq.${userId}&order=updated_at.desc`);
    if (!error && data && data.length > 0) {
      // data is array of rows, each row has a `data` jsonb field with the day
      const loadedDays = data.map((row) => row.data);
      setDays(loadedDays);
    } else if (!error && (!data || data.length === 0)) {
      setDays([defaultDay()]);
    }
    setLoading(false);
  };

  // Auto-save with debounce
  const saveData = useCallback(async (daysToSave) => {
    if (!session) return;
    setSaveStatus("saving");
    const userId = session.user?.id;
    const db = await supabase.from("trades");

    // Delete all existing rows for this user first
    await db.delete(`user_id=eq.${userId}`);

    // Upsert each day as a separate row
    const rows = daysToSave.map((day) => ({
      id: day.id,
      user_id: userId,
      data: day,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      const { error } = await db.upsert(rows);
      setSaveStatus(error ? "error" : "saved");
    } else {
      setSaveStatus("saved");
    }
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [session]);

  // Debounced save trigger
  useEffect(() => {
    if (!session || days.length === 0) return;
    const timer = setTimeout(() => saveData(days), 1200);
    return () => clearTimeout(timer);
  }, [days, session, saveData]);

  const addDay = () => setDays([...days, defaultDay()]);
  const updateDay = (updated) => setDays(days.map((d) => d.id === updated.id ? updated : d));
  const deleteDay = (id) => setDays(days.filter((d) => d.id !== id));

  const allTrades = days.flatMap((d) => d.trades);
  const byExit = (type) => allTrades.filter((t) => t.exitType === type).length;
  const byError = (cls) => allTrades.filter((t) => t.errorClass === cls).length;
  const total = allTrades.length;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setDays([]);
  };

  if (loading && !session) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-600 font-mono text-xs">loading...</div>
    </div>
  );

  if (!session) return <AuthScreen onAuth={(s) => setSession(s)} />;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200" style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #18181b; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-zinc-950/95 backdrop-blur z-10">
        <div>
          <div className="text-zinc-200 font-mono text-sm tracking-widest uppercase">PBD/LAT · RCA Log</div>
          <div className="text-zinc-600 text-xs mt-0.5 flex items-center gap-2">
            <span>Root Cause Analysis — NY Session</span>
            {saveStatus === "saving" && <span className="text-zinc-500">· saving...</span>}
            {saveStatus === "saved" && <span className="text-emerald-600">· saved ✓</span>}
            {saveStatus === "error" && <span className="text-red-500">· save failed</span>}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setView("log")}
            className={`text-xs px-3 py-1.5 rounded border font-mono transition-colors ${view === "log" ? "bg-zinc-700 border-zinc-500 text-zinc-200" : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}>
            Log
          </button>
          <button onClick={() => setView("summary")}
            className={`text-xs px-3 py-1.5 rounded border font-mono transition-colors ${view === "summary" ? "bg-zinc-700 border-zinc-500 text-zinc-200" : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}>
            Summary
          </button>
          <button onClick={handleSignOut}
            className="text-xs px-3 py-1.5 rounded border font-mono transition-colors bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-red-800 hover:text-red-400">
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-zinc-600 font-mono text-xs text-center py-20">Loading your logs...</div>
        ) : view === "log" ? (
          <>
            {days.map((day) => (
              <DayBlock key={day.id} day={day} onUpdate={updateDay} onDelete={deleteDay} />
            ))}
            <button onClick={addDay}
              className="w-full py-3 border border-dashed border-zinc-700 text-zinc-500 text-sm rounded hover:border-zinc-500 hover:text-zinc-300 transition-colors font-mono tracking-wide">
              + Add New Day
            </button>
          </>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Total Trades", val: total, color: "text-zinc-200" },
                { label: "TP Hit", val: byExit("TP Hit"), color: "text-emerald-400" },
                { label: "SL Hit", val: byExit("SL Hit"), color: "text-red-400" },
                { label: "BE Exit", val: byExit("BE Exit"), color: "text-yellow-400" },
              ].map((s) => (
                <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{s.label}</div>
                  <div className={`text-3xl font-mono ${s.color}`}>{s.val}</div>
                  {total > 0 && s.label !== "Total Trades" && (
                    <div className="text-zinc-600 text-xs mt-1">{((s.val / total) * 100).toFixed(0)}%</div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-widest mb-3">Error Classification Breakdown</div>
              <div className="space-y-2">
                {ERROR_CLASSES.map((cls) => {
                  const count = byError(cls);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={cls} className="flex items-center gap-3">
                      <div className="text-zinc-400 text-xs w-36">{cls}</div>
                      <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${cls === "Valid Loss" ? "bg-emerald-600" : cls === "Model Error" ? "bg-red-600" : cls === "Execution Error" ? "bg-yellow-600" : cls === "Read Error" ? "bg-blue-600" : "bg-purple-600"}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-zinc-500 text-xs font-mono w-8">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-widest mb-3">Recent Corrective Actions</div>
              <div className="space-y-2">
                {allTrades.filter((t) => t.correctiveAction).slice(-5).reverse().map((t) => (
                  <div key={t.id} className="flex gap-3 text-xs border-l-2 border-zinc-700 pl-3">
                    <span className={t.direction === "Long" ? "text-emerald-400" : "text-red-400"}>{t.direction}</span>
                    <span className="text-zinc-300">{t.correctiveAction}</span>
                  </div>
                ))}
                {allTrades.filter((t) => t.correctiveAction).length === 0 && (
                  <div className="text-zinc-600 text-xs">No corrective actions logged yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
