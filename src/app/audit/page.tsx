"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getVoteByReceipt, getActiveElection } from "@/lib/firebase/firestore";
import { Search, CheckCircle, XCircle, Shield, Hash, Clock, Loader2 } from "lucide-react";

interface VoteRecord {
  id: string;
  receiptToken: string;
  ciphertext: string;
  candidateId: string;
  timestamp?: { seconds: number };
  electionId: string;
}

interface Election {
  id: string;
  title: string;
  candidates: { id: string; name: string; party: string }[];
  status: string;
}

export default function AuditPage() {
  const { user } = useAuth();
  const [token, setToken] = useState("");
  const [result, setResult] = useState<VoteRecord | null>(null);
  const [election, setElection] = useState<Election | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAudit() {
    if (!token.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    try {
      const vote = await getVoteByReceipt(token.trim()) as VoteRecord | null;
      if (!vote) { setNotFound(true); return; }
      setResult(vote);
      const e = await getActiveElection() as Election | null;
      setElection(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap');`}</style>
      <div style={S.inner}>
        <div style={S.header}>
          <div style={S.iconBox}><Search style={{ width: 22, height: 22, color: "#fff" }} /></div>
          <div>
            <h1 style={S.title}>Vote Audit</h1>
            <p style={S.sub}>Verify your vote was recorded correctly</p>
          </div>
        </div>

        <div style={S.card}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: "0 0 16px" }}>Enter your receipt token</p>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Hash style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#475569" }} />
              <input
                value={token}
                onChange={e => setToken(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAudit()}
                placeholder="Paste your receipt token here..."
                style={{ ...S.input, paddingLeft: 36 }}
              />
            </div>
            <button onClick={handleAudit} disabled={loading || !token.trim()} style={S.searchBtn}>
              {loading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Search style={{ width: 16, height: 16 }} />}
              Verify
            </button>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>

        {notFound && (
          <div style={S.notFoundCard}>
            <XCircle style={{ width: 40, height: 40, color: "#f87171", margin: "0 auto 12px" }} />
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: "0 0 6px" }}>Token Not Found</p>
            <p style={{ color: "#64748b", fontSize: 13 }}>No vote matches this receipt token. Double-check and try again.</p>
          </div>
        )}

        {result && (
          <div style={S.resultCard}>
            <div style={S.resultHeader}>
              <CheckCircle style={{ width: 40, height: 40, color: "#4ade80" }} />
              <div>
                <p style={{ color: "#4ade80", fontWeight: 700, fontSize: 16, margin: 0 }}>Vote Verified</p>
                <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>Your vote is recorded on the bulletin board</p>
              </div>
            </div>

            <div style={S.divider} />

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={S.row}>
                <span style={S.rowLabel}>Receipt Token</span>
                <code style={S.rowValue}>{result.receiptToken}</code>
              </div>
              <div style={S.row}>
                <span style={S.rowLabel}>Election ID</span>
                <code style={S.rowValue}>{result.electionId}</code>
              </div>
              <div style={S.row}>
                <span style={S.rowLabel}>Timestamp</span>
                <span style={{ ...S.rowValue, fontFamily: "inherit" }}>
                  <Clock style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />
                  {result.timestamp ? new Date(result.timestamp.seconds * 1000).toLocaleString() : "pending"}
                </span>
              </div>
              {election?.status === "closed" && (
                <div style={S.row}>
                  <span style={S.rowLabel}>Candidate</span>
                  <span style={{ ...S.rowValue, fontFamily: "inherit", color: "#4ade80" }}>
                    {election.candidates.find(c => c.id === result.candidateId)?.name ?? result.candidateId}
                  </span>
                </div>
              )}
              <div>
                <span style={S.rowLabel}>Encrypted Vote (Ciphertext)</span>
                <div style={S.cipherBox}>
                  <code style={S.cipherText}>{result.ciphertext.slice(0, 160)}...</code>
                </div>
              </div>
            </div>

            <div style={S.cryptoNote}>
              <Shield style={{ width: 13, height: 13, color: "#60a5fa", flexShrink: 0 }} />
              <span style={{ color: "#93c5fd", fontSize: 12 }}>
                This ciphertext matches the one on the public bulletin board. Your vote was included in the homomorphic tally without being individually decrypted.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#020817", fontFamily: "'Space Grotesk',sans-serif", padding: "40px 24px" },
  inner: { maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 },
  header: { display: "flex", alignItems: "center", gap: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#10b981,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 },
  sub: { color: "#64748b", fontSize: 13, margin: "4px 0 0" },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 },
  input: { width: "100%", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 13, fontFamily: "'Space Grotesk',sans-serif", boxSizing: "border-box" },
  searchBtn: { display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#3b82f6,#6366f1)", border: "none", borderRadius: 10, padding: "12px 20px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", whiteSpace: "nowrap" },
  notFoundCard: { background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20, padding: "40px", textAlign: "center" },
  resultCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 20 },
  resultHeader: { display: "flex", alignItems: "center", gap: 16 },
  divider: { height: 1, background: "rgba(255,255,255,0.07)" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  rowLabel: { color: "#64748b", fontSize: 13 },
  rowValue: { color: "#e2e8f0", fontSize: 12, fontFamily: "monospace", background: "rgba(0,0,0,0.3)", padding: "4px 10px", borderRadius: 6 },
  cipherBox: { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px", marginTop: 8 },
  cipherText: { color: "#475569", fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" },
  cryptoNote: { display: "flex", gap: 8, background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "10px 14px" },
};