"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getActiveElection, subscribeToVotes } from "@/lib/firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { Activity, Users, Shield, TrendingUp, Zap, Lock, BarChart2 } from "lucide-react";

interface Candidate { id: string; name: string; party: string; }
interface Election {
  id: string; title: string; candidates: Candidate[];
  status: string; publicKey: Record<string,string>; deadline?: string;
}
interface Vote {
  id: string; candidateId: string; timestamp?: { seconds: number };
  receiptToken: string; ciphertext: string;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [election, setElection] = useState<Election | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [timeline, setTimeline] = useState<{ time: string; count: number }[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [lastVote, setLastVote] = useState<Vote | null>(null);
  const [newVotePulse, setNewVotePulse] = useState(false);
  const [hoursLeft, setHoursLeft] = useState<number | null>(null);
  const prevCount = useRef(0);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    // Avoid synchronous setState in effect body to prevent cascading renders.
    // Defer the initial state update to the next tick.
    if (!election?.deadline) {
      const t = setTimeout(() => setHoursLeft(null), 0);
      return () => clearTimeout(t);
    }

    const deadline = new Date(election.deadline);
    const computeHours = () => Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 3600000));
    const initTimer = setTimeout(() => setHoursLeft(computeHours()), 0);
    const timer = setInterval(() => setHoursLeft(computeHours()), 60000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(timer);
    };
  }, [election?.deadline]);

  useEffect(() => {
    if (!user) return;
    let unsub: () => void;
    async function load() {
      const e = await getActiveElection() as Election | null;
      setElection(e);
      if (e) {
        unsub = subscribeToVotes(e.id, (v) => {
          // subscribeToVotes may return plain records; normalize to Vote[]
          const voteList = (v as Record<string, unknown>[]).map(item => {
            const idVal = item['id'];
            const candidateVal = item['candidateId'];
            const receiptVal = item['receiptToken'];
            const ciphertextVal = item['ciphertext'];
            return {
              id: idVal === undefined || idVal === null ? "" : String(idVal),
              candidateId: candidateVal === undefined || candidateVal === null ? "" : String(candidateVal),
              timestamp: item['timestamp'],
              receiptToken: receiptVal === undefined || receiptVal === null ? "" : String(receiptVal),
              ciphertext: ciphertextVal === undefined || ciphertextVal === null ? "" : String(ciphertextVal),
            } as Vote;
          }) as Vote[];
          setVotes(voteList);
          setLoadingData(false);
          if (voteList.length > prevCount.current) {
            setLastVote(voteList[voteList.length - 1]);
            setNewVotePulse(true);
            setTimeout(() => setNewVotePulse(false), 2000);
          }
          prevCount.current = voteList.length;
          // Build timeline — group by minute
          const groups: Record<string, number> = {};
          voteList.forEach(vote => {
            if (!vote.timestamp) return;
            const d = new Date(vote.timestamp.seconds * 1000);
            const key = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
            groups[key] = (groups[key] || 0) + 1;
          });
          let running = 0;
          const tl = Object.entries(groups).map(([time, count]) => {
            running += count;
            return { time, count: running };
          });
          setTimeline(tl);
        });
      } else {
        setLoadingData(false);
      }
    }
    load();
    return () => { if (unsub) unsub(); };
  }, [user]);

  if (loading || loadingData) return (
    <div style={S.center}>
      <div style={S.spinner} />
      <p style={{ color: "#64748b", marginTop: 12, fontFamily: "'Space Grotesk',sans-serif" }}>Connecting to live feed...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );

  if (!election) return (
    <div style={S.center}>
      <p style={{ color: "#fff", fontFamily: "'Space Grotesk',sans-serif", fontSize: 18 }}>No active election</p>
    </div>
  );

  const totalVotes = votes.length;
  const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];
  const barData = election.candidates.map((c, i) => ({
    name: c.name.split(" ")[0],
    votes: votes.filter(v => v.candidateId === c.id).length,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.05);opacity:0.8}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
      `}</style>
      <div style={S.inner}>

        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={S.liveDot} />
              <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>LIVE</span>
            </div>
            <h1 style={S.title}>{election.title}</h1>
            <p style={S.sub}>Real-time encrypted vote dashboard</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {hoursLeft !== null && (
              <div style={S.timerBadge}>
                <Activity style={{ width: 14, height: 14, color: "#f59e0b" }} />
                <span style={{ color: "#fbbf24", fontWeight: 600 }}>{hoursLeft}h left</span>
              </div>
            )}
            <div style={S.encBadge}>
              <Lock style={{ width: 14, height: 14, color: "#60a5fa" }} />
              <span style={{ color: "#93c5fd", fontSize: 13 }}>End-to-end encrypted</span>
            </div>
          </div>
        </div>

        {/* New vote alert */}
        {newVotePulse && lastVote && (
          <div style={{ ...S.newVoteAlert, animation: "slideIn 0.3s ease" }}>
            <Zap style={{ width: 16, height: 16, color: "#fbbf24" }} />
            <span style={{ color: "#fbbf24", fontWeight: 600, fontSize: 13 }}>New encrypted vote received!</span>
            <code style={{ color: "#64748b", fontSize: 11, fontFamily: "monospace", marginLeft: "auto" }}>
              {lastVote.receiptToken}
            </code>
          </div>
        )}

        {/* Stat cards */}
        <div style={S.statsGrid}>
          {[
            { label: "Total Votes", value: totalVotes, icon: Users, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)" },
            { label: "Candidates", value: election.candidates.length, icon: TrendingUp, color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)" },
            { label: "Encrypted", value: totalVotes, icon: Shield, color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
            { label: "Status", value: "Live", icon: Activity, color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.2)" },
          ].map((s, i) => (
            <div key={i} style={{ ...S.statCard, background: s.bg, border: `1px solid ${s.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <s.icon style={{ width: 18, height: 18, color: s.color }} />
                <span style={{ color: s.color, fontSize: 11, fontWeight: 600 }}>●</span>
              </div>
              <p style={{ color: "#fff", fontSize: 28, fontWeight: 700, margin: 0, ...(newVotePulse && s.label === "Total Votes" ? { animation: "pulse 0.5s ease" } : {}) }}>
                {s.value}
              </p>
              <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={S.chartsRow}>
          {/* Bar chart — vote distribution */}
          <div style={S.chartCard}>
            <p style={S.chartTitle}>
              <BarChart2 size={16} color="#3b82f6" />
              Vote Distribution
            </p>
            {totalVotes === 0 ? (
              <div style={S.noData}>Waiting for votes...</div>
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12, fontFamily: "Space Grotesk" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 12, fontFamily: "Space Grotesk" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontFamily: "Space Grotesk" }}
                      labelStyle={{ color: "#fff" }}
                      itemStyle={{ color: "#94a3b8" }}
                    />
                    <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                      {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div style={S.chartCard}>
            <p style={S.chartTitle}>
              <TrendingUp size={16} color="#10b981" />
              Vote Timeline
            </p>
            {timeline.length < 2 ? (
              <div style={S.noData}>Collecting data...</div>
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="voteGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11, fontFamily: "Space Grotesk" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11, fontFamily: "Space Grotesk" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontFamily: "Space Grotesk" }}
                      labelStyle={{ color: "#fff" }}
                      itemStyle={{ color: "#10b981" }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#voteGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Live vote feed */}
        <div style={S.feedCard}>
          <p style={S.chartTitle}>
            <Activity size={16} color="#6366f1" />
            Live Encrypted Vote Feed
            <span style={{ marginLeft: "auto", color: "#64748b", fontSize: 12, fontWeight: 400 }}>{totalVotes} total</span>
          </p>
          <div style={S.feedList}>
            {votes.length === 0 ? (
              <div style={S.noData}>No votes yet — feed will update in real time</div>
            ) : (
              [...votes].reverse().slice(0, 8).map((v, i) => (
                <div key={v.id} style={{ ...S.feedRow, animation: `fadeIn 0.3s ease ${i * 0.05}s both` }}>
                  <div style={S.feedDot} />
                  <code style={S.feedToken}>{v.receiptToken}</code>
                  <div style={S.feedCipher}>{v.ciphertext.slice(0, 40)}...</div>
                  <span style={S.feedTime}>
                    {v.timestamp ? new Date(v.timestamp.seconds * 1000).toLocaleTimeString() : "pending"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Crypto info */}
        <div style={S.cryptoCard}>
          <Shield style={{ width: 20, height: 20, color: "#60a5fa", flexShrink: 0 }} />
          <div>
            <p style={{ color: "#fff", fontWeight: 600, fontSize: 14, margin: "0 0 4px" }}>Damgård-Jurik Homomorphic Encryption Active</p>
            <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
              All votes are encrypted client-side before submission. The server only stores ciphertexts. Results are computed via homomorphic multiplication — Dec(C₁ × C₂ × ... × Cₙ) — without ever decrypting individual votes.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#020817", fontFamily: "'Space Grotesk',sans-serif", padding: "32px 24px" },
  inner: { maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 },
  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", background: "#020817" },
  spinner: { width: 32, height: 32, border: "3px solid rgba(59,130,246,0.2)", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 },
  title: { color: "#fff", fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" },
  sub: { color: "#64748b", fontSize: 13, margin: "4px 0 0" },
  liveDot: { width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 0 3px rgba(74,222,128,0.2)", animation: "pulse 1.5s ease infinite" },
  timerBadge: { display: "flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "8px 14px" },
  encBadge: { display: "flex", alignItems: "center", gap: 6, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "8px 14px" },
  newVoteAlert: { display: "flex", alignItems: "center", gap: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "12px 16px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 },
  statCard: { borderRadius: 16, padding: "18px 20px" },
  chartsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  chartCard: { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "20px 22px" },
  chartTitle: { display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 14, fontWeight: 700, margin: "0 0 16px" },
  noData: { height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", fontSize: 13 },
  feedCard: { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "20px 22px" },
  feedList: { display: "flex", flexDirection: "column", gap: 8 },
  feedRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10 },
  feedDot: { width: 8, height: 8, borderRadius: "50%", background: "#4ade80", flexShrink: 0 },
  feedToken: { color: "#6366f1", fontSize: 11, fontFamily: "monospace", width: 80, flexShrink: 0 },
  feedCipher: { color: "#334155", fontSize: 11, fontFamily: "monospace", flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
  feedTime: { color: "#475569", fontSize: 11, flexShrink: 0 },
  cryptoCard: { display: "flex", gap: 14, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 16, padding: "18px 20px" },
};