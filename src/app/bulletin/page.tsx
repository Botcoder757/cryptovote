"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getActiveElection, subscribeToVotes } from "@/lib/firebase/firestore";
import { verifyZKProof, deserializePublicKey } from "@/lib/crypto/damgardJurik";
import { Shield, Clock, Hash, Loader2, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

interface Vote {
  id: string;
  voterId: string;
  ciphertext: string;
  receiptToken: string;
  timestamp?: { seconds: number };
  candidateId: string;
  zkProof?: string;
}

interface Election {
  id: string;
  title: string;
  candidates: { id: string; name: string; party: string }[];
  status: string;
  publicKey: Record<string, string>;
}

type VResult = { valid: boolean; checks: { label: string; passed: boolean; detail: string }[] } | "fail";

export default function BulletinPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [election, setElection] = useState<Election | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [verified, setVerified] = useState<Record<string, VResult>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let unsub: () => void;
    async function load() {
      const e = await getActiveElection() as Election | null;
      setElection(e);
      if (e) {
        unsub = subscribeToVotes(e.id, (v) => {
          setVotes(v as unknown as Vote[]);
          setLoadingData(false);
        });
      } else {
        setLoadingData(false);
      }
    }
    load();
    return () => { if (unsub) unsub(); };
  }, [user]);

  async function handleVerify(vote: Vote) {
    if (!election) return;

    // toggle collapse
    if (expanded[vote.id]) {
      setExpanded(p => ({ ...p, [vote.id]: false }));
      return;
    }

    // already verified — just expand
    if (verified[vote.id]) {
      setExpanded(p => ({ ...p, [vote.id]: true }));
      return;
    }

    setVerifying(p => ({ ...p, [vote.id]: true }));
    try {
      if (!vote.zkProof) {
        setVerified(p => ({ ...p, [vote.id]: "fail" }));
        setExpanded(p => ({ ...p, [vote.id]: true }));
        return;
      }
      const pk = deserializePublicKey(election.publicKey);
      const proof = JSON.parse(vote.zkProof);
      const result = verifyZKProof(proof, pk);
      setVerified(p => ({ ...p, [vote.id]: result }));
      setExpanded(p => ({ ...p, [vote.id]: true }));
    } catch {
      setVerified(p => ({ ...p, [vote.id]: "fail" }));
      setExpanded(p => ({ ...p, [vote.id]: true }));
    } finally {
      setVerifying(p => ({ ...p, [vote.id]: false }));
    }
  }

  if (loading || loadingData) return (
    <div style={S.center}>
      <Loader2 style={{ width: 28, height: 28, color: "#3b82f6", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={S.inner}>

        {/* Header */}
        <div style={S.header}>
          <div style={S.iconBox}>
            <Shield style={{ width: 22, height: 22, color: "#fff" }} />
          </div>
          <div>
            <h1 style={S.title}>Public Bulletin Board</h1>
            <p style={S.sub}>All encrypted votes — publicly verifiable, individually unreadable</p>
          </div>
          <div style={S.liveBadge}>
            <span style={S.liveDot} />
            <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>LIVE</span>
            <span style={{ color: "#64748b", fontSize: 13 }}>{votes.length} votes</span>
          </div>
        </div>

        {/* Notice */}
        <div style={S.notice}>
          <Shield style={{ width: 14, height: 14, color: "#60a5fa", flexShrink: 0 }} />
          <span style={{ color: "#93c5fd", fontSize: 13 }}>
            Each row is a real encrypted vote. Click <strong>Verify Proof</strong> on any vote to confirm it encodes 0 or 1 — without revealing who was chosen.
          </span>
        </div>

        {/* Votes */}
        {votes.length === 0 ? (
          <div style={S.empty}>
            <RefreshCw style={{ width: 36, height: 36, color: "#334155", margin: "0 auto 12px" }} />
            <p style={{ color: "#fff", fontWeight: 600 }}>No votes yet</p>
            <p style={{ color: "#64748b", fontSize: 13 }}>Be the first to vote!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {votes.map((v, i) => {
              const vResult = verified[v.id];
              const isExpanded = expanded[v.id];
              const isVerifying = verifying[v.id];

              return (
                <div key={v.id} style={{ ...S.voteCard, animation: `fadeIn 0.3s ease ${i * 0.03}s both` }}>
                  <div style={S.voteIndex}>{votes.length - i}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Top row — badges + verify button */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={S.tokenBadge}>
                        <Hash style={{ width: 11, height: 11 }} />
                        {v.receiptToken}
                      </span>
                      <span style={S.timeBadge}>
                        <Clock style={{ width: 11, height: 11 }} />
                        {v.timestamp ? new Date(v.timestamp.seconds * 1000).toLocaleTimeString() : "pending"}
                      </span>
                      <span style={S.encBadge}>🔐 encrypted</span>

                      <button onClick={() => handleVerify(v)} style={S.verifyBtn} disabled={isVerifying}>
                        {isVerifying
                          ? <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />
                          : isExpanded
                            ? <ChevronUp style={{ width: 11, height: 11 }} />
                            : <ChevronDown style={{ width: 11, height: 11 }} />}
                        {isVerifying ? "Verifying..." : "Verify Proof"}
                      </button>
                    </div>

                    {/* Ciphertext */}
                    <div style={S.cipherBox}>
                      <code style={S.cipherText}>{v.ciphertext.slice(0, 120)}...</code>
                    </div>

                    <p style={{ color: "#334155", fontSize: 11, margin: "6px 0 0", fontFamily: "monospace" }}>
                      voter: {v.voterId}
                    </p>

                    {/* ZKP result accordion */}
                    {isExpanded && (
                      <div style={S.proofBox}>
                        {vResult === "fail" || !vResult ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <XCircle style={{ width: 16, height: 16, color: "#f87171" }} />
                            <span style={{ color: "#f87171", fontSize: 13 }}>
                              {!v.zkProof
                                ? "No ZKP stored — vote cast before ZKP was enabled"
                                : "Proof invalid — vote may be tampered"}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {vResult.checks.map((c, idx) => (
                              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {c.passed
                                  ? <CheckCircle style={{ width: 14, height: 14, color: "#4ade80", flexShrink: 0 }} />
                                  : <XCircle style={{ width: 14, height: 14, color: "#f87171", flexShrink: 0 }} />}
                                <code style={{ color: c.passed ? "#4ade80" : "#f87171", fontSize: 11 }}>
                                  {c.label}
                                </code>
                              </div>
                            ))}
                            <p style={{ color: "#64748b", fontSize: 11, margin: "4px 0 0" }}>
                              {vResult.valid
                                ? "✅ Vote cryptographically proven to encode 0 or 1"
                                : "❌ One or more checks failed"}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#020817", fontFamily: "'Space Grotesk',sans-serif", padding: "40px 24px" },
  inner: { maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 },
  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  header: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" },
  iconBox: { width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 },
  sub: { color: "#64748b", fontSize: 13, margin: "4px 0 0" },
  liveBadge: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "8px 14px" },
  liveDot: { width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" },
  notice: { display: "flex", gap: 10, background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, padding: "12px 16px" },
  empty: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "60px 40px", textAlign: "center" },
  voteCard: { display: "flex", gap: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 20px" },
  voteIndex: { width: 32, height: 32, borderRadius: 8, background: "rgba(99,102,241,0.15)", color: "#818cf8", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tokenBadge: { display: "flex", alignItems: "center", gap: 4, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, padding: "3px 8px", color: "#818cf8", fontSize: 11, fontFamily: "monospace" },
  timeBadge: { display: "flex", alignItems: "center", gap: 4, color: "#64748b", fontSize: 11 },
  encBadge: { fontSize: 11, color: "#4ade80", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 6, padding: "3px 8px" },
  verifyBtn: { display: "flex", alignItems: "center", gap: 4, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 6, padding: "3px 10px", color: "#a78bfa", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif" },
  cipherBox: { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px" },
  cipherText: { color: "#475569", fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" },
  proofBox: { marginTop: 12, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px" },
};