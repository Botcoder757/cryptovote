"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getLatestElection, getVotesForElection } from "@/lib/firebase/firestore";
import { BarChart3, Users, Trophy, Clock, Lock, Download, Loader2, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import jsPDF from "jspdf";

interface Candidate {
  id: string;
  name: string;
  party: string;
}

interface Election {
  id: string;
  title: string;
  description: string;
  candidates: Candidate[];
  status: string;
  publicKey: Record<string, string>;
  results?: Record<string, number>;
  createdAt?: { seconds: number };
  closedAt?: { seconds: number };
  deadline?: string;
}

export default function ResultsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [election, setElection] = useState<Election | null>(null);
  const [votes, setVotes] = useState<{ id: string; candidateId: string; receiptToken: string; ciphertext: string; timestamp?: { seconds: number } }[]>([]);
  const [voteCount, setVoteCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
  setLoadingData(true);
  try {
    const e = await getLatestElection() as Election | null;
    if (e) {
      setElection(e);
      const v = await getVotesForElection(e.id);
      setVotes(v as typeof votes);
      // for closed elections use sum from results, not vote collection count
      if (e.status === "closed" && e.results) {
        const sum = Object.values(e.results as Record<string, number>).reduce((a, b) => a + b, 0);
        setVoteCount(sum);
      } else {
        setVoteCount(v.length);
      }
    }
  } finally {
    setLoadingData(false);
  }
}

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timeout);
  }, [user]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function exportPDF() {
    if (!election) return;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = 0;

    // ── Background ──
    doc.setFillColor(2, 8, 23);
    doc.rect(0, 0, pageW, pageH, "F");

    // ── Header band ──
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 52, "F");
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.8);
    doc.line(0, 52, pageW, 52);

    // Logo circle
    doc.setFillColor(59, 130, 246);
    doc.circle(20, 26, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("EV", 20, 29, { align: "center" });

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("EVoting — Official Election Report", 34, 22);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Damgard-Jurik Homomorphic Encryption System", 34, 32);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 34, 40);

    y = 64;

    // ── Election Info box ──
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(14, y, pageW - 28, 52, 3, 3, "F");
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, y, pageW - 28, 52, 3, 3, "S");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(148, 163, 184);
    doc.text("ELECTION DETAILS", 20, y + 10);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(election.title, 20, y + 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Description: ${election.description || "N/A"}`, 20, y + 29);
    doc.text(`Deadline: ${election.deadline || "N/A"}`, 20, y + 37);
    doc.text(`Election ID: ${election.id}`, 20, y + 45);

    // Status badge (right side)
    const statusColor = election.status === "closed" ? [74, 222, 128] : [245, 158, 11];
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(pageW - 50, y + 8, 36, 12, 2, 2, "F");
    doc.setTextColor(2, 8, 23);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(election.status.toUpperCase(), pageW - 32, y + 16, { align: "center" });

    y += 62;

    // ── Stats row ──
    const statW = (pageW - 28 - 8) / 3;
    const stats = [
      { label: "TOTAL VOTES", value: String(voteCount), color: [59, 130, 246] },
      { label: "CANDIDATES", value: String(election.candidates.length), color: [139, 92, 246] },
      { label: "STATUS", value: election.status === "closed" ? "CLOSED" : "OPEN", color: statusColor },
    ];
    stats.forEach((s, i) => {
      const x = 14 + i * (statW + 4);
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(x, y, statW, 28, 3, 3, "F");
      doc.setDrawColor(s.color[0], s.color[1], s.color[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, statW, 28, 3, 3, "S");
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(s.color[0], s.color[1], s.color[2]);
      doc.text(s.value, x + statW / 2, y + 14, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(s.label, x + statW / 2, y + 22, { align: "center" });
    });

    y += 38;

    // ── Results section ──
    if (election.status === "closed" && election.results) {
      const results = election.results;
      const total = Object.values(results).reduce((a, b) => a + b, 0);
      const sorted = [...election.candidates].sort((a, b) => (results[b.id] ?? 0) - (results[a.id] ?? 0));
      const winner = sorted[0];

      // Winner banner
      doc.setFillColor(10, 30, 10);
      doc.roundedRect(14, y, pageW - 28, 30, 3, 3, "F");
      doc.setDrawColor(74, 222, 128);
      doc.setLineWidth(0.5);
      doc.roundedRect(14, y, pageW - 28, 30, 3, 3, "S");

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(74, 222, 128);
      doc.text("WINNER", 22, y + 10);
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(`${winner.name}  (${winner.party})`, 22, y + 20);
      const winVotes = results[winner.id] ?? 0;
      const winPct = total > 0 ? Math.round((winVotes / total) * 100) : 0;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(74, 222, 128);
      doc.text(`${winVotes} votes  (${winPct}%)`, pageW - 16, y + 16, { align: "right" });

      y += 40;

      // Section title
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(148, 163, 184);
      doc.text("FINAL RESULTS BREAKDOWN", 14, y);
      y += 8;

      // Each candidate
      sorted.forEach((c, i) => {
        const count = results[c.id] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const isWin = c.id === winner.id;
        const barColor = isWin ? [59, 130, 246] : [30, 41, 59];
        const fillColor = isWin ? [74, 222, 128] : [99, 102, 241];

        doc.setFillColor(15, 23, 42);
        doc.roundedRect(14, y, pageW - 28, 26, 2, 2, "F");
        if (isWin) {
          doc.setDrawColor(59, 130, 246);
          doc.setLineWidth(0.4);
          doc.roundedRect(14, y, pageW - 28, 26, 2, 2, "S");
        }

        // Rank
        doc.setFillColor(30, 41, 59);
        doc.circle(22, y + 13, 5, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(148, 163, 184);
        doc.text(String(i + 1), 22, y + 16, { align: "center" });

        // Name
        doc.setFontSize(10);
        doc.setFont("helvetica", isWin ? "bold" : "normal");
        doc.setTextColor(isWin ? 255 : 200, isWin ? 255 : 200, isWin ? 255 : 200);
        doc.text(`${isWin ? "* " : ""}${c.name}`, 30, y + 10);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(c.party, 30, y + 17);

        // Vote count right
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(isWin ? 74 : 148, isWin ? 222 : 163, isWin ? 128 : 184);
        doc.text(`${count}  (${pct}%)`, pageW - 16, y + 12, { align: "right" });

        // Progress bar
        const barX = 30;
        const barW = pageW - 60;
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(barX, y + 19, barW, 3, 1, 1, "F");
        if (pct > 0) {
          doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
          doc.roundedRect(barX, y + 19, (barW * pct) / 100, 3, 1, 1, "F");
        }

        y += 32;
      });

      y += 6;

      // ── Vote log section ──
      if (votes.length > 0) {
        // New page if needed
        if (y > pageH - 60) {
          doc.addPage();
          doc.setFillColor(2, 8, 23);
          doc.rect(0, 0, pageW, pageH, "F");
          y = 20;
        }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(148, 163, 184);
        doc.text("ENCRYPTED VOTE LOG (BULLETIN BOARD)", 14, y);
        y += 8;

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(`${votes.length} encrypted votes recorded. Ciphertexts are truncated for display.`, 14, y);
        y += 8;

        // Table header
        doc.setFillColor(15, 23, 42);
        doc.rect(14, y, pageW - 28, 10, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("#", 18, y + 7);
        doc.text("RECEIPT TOKEN", 26, y + 7);
        doc.text("TIMESTAMP", 90, y + 7);
        doc.text("CIPHERTEXT (truncated)", 130, y + 7);
        y += 12;

        votes.slice(0, 20).forEach((v, i) => {
          if (y > pageH - 20) {
            doc.addPage();
            doc.setFillColor(2, 8, 23);
            doc.rect(0, 0, pageW, pageH, "F");
            y = 20;
          }
          const rowBg = i % 2 === 0 ? [10, 15, 30] : [15, 23, 42];
          doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
          doc.rect(14, y, pageW - 28, 9, "F");

          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text(String(i + 1), 18, y + 6);
          doc.setTextColor(99, 102, 241);
          doc.text((v.receiptToken || "").slice(0, 20), 26, y + 6);
          doc.setTextColor(100, 116, 139);
          const ts = v.timestamp ? new Date(v.timestamp.seconds * 1000).toLocaleString() : "pending";
          doc.text(ts, 90, y + 6);
          doc.setTextColor(71, 85, 105);
          doc.text((v.ciphertext || "").slice(0, 40) + "...", 130, y + 6);
          y += 9;
        });
        if (votes.length > 20) {
          y += 4;
          doc.setFontSize(7);
          doc.setTextColor(71, 85, 105);
          doc.text(`... and ${votes.length - 20} more votes (full log available on bulletin board)`, 14, y);
          y += 8;
        }
      }

      y += 10;
      // ── Crypto note footer ──
      if (y > pageH - 30) {
        doc.addPage();
        doc.setFillColor(2, 8, 23);
        doc.rect(0, 0, pageW, pageH, "F");
        y = 20;
      }
      doc.setFillColor(5, 15, 5);
      doc.roundedRect(14, y, pageW - 28, 22, 2, 2, "F");
      doc.setDrawColor(74, 222, 128);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, y, pageW - 28, 22, 2, 2, "S");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(74, 222, 128);
      doc.text("CRYPTOGRAPHIC INTEGRITY", 20, y + 8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Results computed via homomorphic addition: Dec(C1 x C2 x ... x Cn) mod n^2", 20, y + 15);
      doc.text("Individual votes were NEVER decrypted. Privacy guaranteed by Damgard-Jurik IND-CPA security.", 20, y + 21);

    } else {
      doc.setFontSize(12);
      doc.setTextColor(245, 158, 11);
      doc.text("Election is still open — results not yet available.", 14, y + 10);
    }

    // ── Footer ──
    const totalPages = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFillColor(10, 15, 30);
      doc.rect(0, pageH - 12, pageW, 12, "F");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text("EVoting — Damgard-Jurik Cryptosystem | Confidential Election Report", pageW / 2, pageH - 4, { align: "center" });
      doc.text(`Page ${p} of ${totalPages}`, pageW - 14, pageH - 4, { align: "right" });
    }

    doc.save(`evoting-report-${election.title.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  if (loading || loadingData) {
    return (
      <div style={styles.center}>
        <Loader2 style={{ width: 32, height: 32, color: "#3b82f6", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!election) {
    return (
      <div style={styles.center}>
        <div style={styles.emptyCard}>
          <BarChart3 style={{ width: 48, height: 48, color: "#475569", margin: "0 auto 16px" }} />
          <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No Election Found</h2>
          <p style={{ color: "#64748b", fontSize: 14 }}>No active or recent election to display.</p>
        </div>
      </div>
    );
  }

  const isOpen = election.status === "open";
  const results = election.results;
  const total = results ? Object.values(results).reduce((a, b) => a + b, 0) : 0;
  const winner = results && election.candidates.length > 0
    ? election.candidates.reduce((a, b) => (results[a.id] ?? 0) > (results[b.id] ?? 0) ? a : b)
    : null;

  const chartData = election.candidates.map((c) => ({
    name: c.name.split(" ")[0],
    fullName: c.name,
    votes: results?.[c.id] ?? 0,
    party: c.party,
  }));

  const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={styles.pageInner}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}>
              <BarChart3 style={{ width: 22, height: 22, color: "#fff" }} />
            </div>
            <div>
              <h1 style={styles.title}>Results Dashboard</h1>
              <p style={styles.subtitle}>{election.title}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleRefresh} style={styles.refreshBtn}>
              <RefreshCw style={{ width: 14, height: 14, ...(refreshing ? { animation: "spin 1s linear infinite" } : {}) }} />
              Refresh
            </button>
            <button onClick={exportPDF} style={styles.exportBtn}>
              <Download style={{ width: 14, height: 14 }} />
              Export PDF
            </button>
          </div>
        </div>

        {/* Status banner */}
        {isOpen ? (
          <div style={styles.openBanner}>
            <Clock style={{ width: 16, height: 16, color: "#f59e0b" }} />
            <span style={{ color: "#fbbf24", fontSize: 14, fontWeight: 600 }}>Election is Live</span>
            <span style={{ color: "#92400e", fontSize: 13 }}>— Results revealed after admin closes the election</span>
          </div>
        ) : (
          <div style={styles.closedBanner}>
            <Lock style={{ width: 16, height: 16, color: "#4ade80" }} />
            <span style={{ color: "#4ade80", fontSize: 14, fontWeight: 600 }}>Election Closed</span>
            <span style={{ color: "#166534", fontSize: 13 }}>— Final results computed via homomorphic tally</span>
          </div>
        )}

        {/* Stats row */}
        <div style={styles.statsRow}>
          {[
            { label: "Total Votes", value: voteCount, icon: Users, color: "#3b82f6" },
            { label: "Candidates", value: election.candidates.length, icon: Trophy, color: "#8b5cf6" },
            { label: "Status", value: isOpen ? "Live" : "Closed", icon: Clock, color: isOpen ? "#f59e0b" : "#4ade80" },
          ].map((s) => (
            <div key={s.label} style={styles.statCard}>
              <div style={{ ...styles.statIcon, background: `${s.color}20`, border: `1px solid ${s.color}30` }}>
                <s.icon style={{ width: 18, height: 18, color: s.color }} />
              </div>
              <div>
                <p style={styles.statValue}>{s.value}</p>
                <p style={styles.statLabel}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Closed — show full results */}
        {!isOpen && results ? (
          <>
            {winner && (
              <div style={styles.winnerCard}>
                <div style={styles.winnerLeft}>
                  <span style={{ fontSize: 32 }}>🏆</span>
                  <div>
                    <p style={{ color: "#94a3b8", fontSize: 12, margin: "0 0 4px", fontWeight: 600 }}>WINNER</p>
                    <p style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>{winner.name}</p>
                    <p style={{ color: "#64748b", fontSize: 14, margin: "4px 0 0" }}>{winner.party}</p>
                  </div>
                </div>
                <div style={styles.winnerRight}>
                  <p style={{ color: "#4ade80", fontSize: 32, fontWeight: 700, margin: 0 }}>
                    {results[winner.id] ?? 0}
                  </p>
                  <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
                    {total > 0 ? Math.round(((results[winner.id] ?? 0) / total) * 100) : 0}% of votes
                  </p>
                </div>
              </div>
            )}

            <div style={styles.chartCard}>
              <p style={styles.cardTitle}>Vote Distribution</p>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12, fontFamily: "Space Grotesk" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 12, fontFamily: "Space Grotesk" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontFamily: "Space Grotesk" }}
                      labelStyle={{ color: "#fff", fontWeight: 600 }}
                      itemStyle={{ color: "#94a3b8" }}
                      formatter={(value) => `${Number(value ?? 0)} votes`}
                    />
                    <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={styles.card}>
              <p style={styles.cardTitle}>Detailed Results</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {election.candidates
                  .sort((a, b) => (results[b.id] ?? 0) - (results[a.id] ?? 0))
                  .map((c, i) => {
                    const count = results[c.id] ?? 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const isWin = winner?.id === c.id;
                    return (
                      <div key={c.id} style={{ ...styles.resultRow, ...(isWin ? styles.resultRowWinner : {}) }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <span style={styles.rankBadge}>{i + 1}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <div>
                                <span style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
                                  {isWin ? "🏆 " : ""}{c.name}
                                </span>
                                <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>{c.party}</span>
                              </div>
                              <span style={{ color: isWin ? "#4ade80" : "#94a3b8", fontWeight: 700, fontSize: 15 }}>
                                {count} <span style={{ fontSize: 12, fontWeight: 400 }}>({pct}%)</span>
                              </span>
                            </div>
                            <div style={styles.progressBg}>
                              <div style={{
                                ...styles.progressFill,
                                width: `${pct}%`,
                                background: isWin
                                  ? "linear-gradient(90deg, #3b82f6, #4ade80)"
                                  : `linear-gradient(90deg, ${COLORS[i % COLORS.length]}80, ${COLORS[i % COLORS.length]}40)`
                              }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div style={styles.tallyNote}>
                <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
                  ✅ Dec(C₁ × C₂ × ... × Cₙ) — Homomorphic tally. No individual vote was decrypted.
                </p>
              </div>
            </div>
          </>
        ) : isOpen ? (
          <div style={styles.liveCard}>
            <div style={styles.livePulse} />
            <p style={{ color: "#fff", fontSize: 48, fontWeight: 700, margin: 0 }}>{voteCount}</p>
            <p style={{ color: "#64748b", fontSize: 16, margin: "8px 0 0" }}>votes cast so far</p>
            <p style={{ color: "#475569", fontSize: 13, marginTop: 16 }}>
              Candidate breakdown hidden while voting is active. Results revealed when admin closes.
            </p>
          </div>
        ) : (
          <div style={styles.emptyCard}>
            <BarChart3 style={{ width: 40, height: 40, color: "#334155", margin: "0 auto 12px" }} />
            <p style={{ color: "#fff", fontWeight: 600, fontSize: 15, margin: "0 0 6px" }}>No results yet</p>
            <p style={{ color: "#64748b", fontSize: 13 }}>Election closed but no tally computed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#020817", fontFamily: "'Space Grotesk', sans-serif", padding: "40px 24px" },
  pageInner: { maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 },
  center: { minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 },
  emptyCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "48px 40px", textAlign: "center", maxWidth: 400 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 },
  headerLeft: { display: "flex", alignItems: "center", gap: 16 },
  headerIcon: { width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #10b981, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 20px rgba(16,185,129,0.3)" },
  title: { color: "#fff", fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" },
  subtitle: { color: "#64748b", fontSize: 14, margin: "4px 0 0" },
  refreshBtn: { display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 16px", color: "#94a3b8", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  exportBtn: { display: "flex", alignItems: "center", gap: 6, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 10, padding: "9px 16px", color: "#60a5fa", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  openBanner: { display: "flex", alignItems: "center", gap: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "12px 18px" },
  closedBanner: { display: "flex", alignItems: "center", gap: 10, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12, padding: "12px 18px" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  statCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px", display: "flex", alignItems: "center", gap: 14 },
  statIcon: { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  statValue: { color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 },
  statLabel: { color: "#64748b", fontSize: 12, margin: "2px 0 0" },
  winnerCard: { background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 20, padding: "28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" },
  winnerLeft: { display: "flex", alignItems: "center", gap: 16 },
  winnerRight: { textAlign: "right" },
  chartCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px" },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px" },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 20px" },
  resultRow: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 20px" },
  resultRowWinner: { background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" },
  rankBadge: { width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.06)", color: "#64748b", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  progressBg: { height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, transition: "width 0.6s ease" },
  tallyNote: { marginTop: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px" },
  liveCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "60px 40px", textAlign: "center", position: "relative", overflow: "hidden" },
  livePulse: { position: "absolute", top: 20, right: 20, width: 12, height: 12, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 0 4px rgba(245,158,11,0.2)" },
};