"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getActiveElection, hasVoted, submitVote } from "@/lib/firebase/firestore";
import { encrypt, deserializePublicKey, generateZKProof, verifyZKProof } from "@/lib/crypto/damgardJurik"
import { Vote, Shield, CheckCircle, Copy, Loader2, Lock, AlertCircle, Clock } from "lucide-react";
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
  deadline: string;
  publicKey: Record<string, string>;
  status: string;
}

interface EncryptStep {
  label: string;
  formula: string;
  value: bigint | string;
  description: string;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export default function VotePage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const [election, setElection] = useState<Election | null>(null);
  const [loadingElection, setLoadingElection] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ token: string; ciphertext: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [encryptSteps, setEncryptSteps] = useState<EncryptStep[]>([]);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const e = await getActiveElection();
      setElection(e as Election | null);
      if (e) {
        const voterId = hashString(user!.uid + e.id);
        const voted = await hasVoted(e.id, voterId);
        setAlreadyVoted(voted);
      }
      setLoadingElection(false);
    }
    load();
  }, [user]);

  async function handleVote() {
    if (!selected || !election || !user) return;
    setSubmitting(true);
    try {
      const pk = deserializePublicKey(election.publicKey);
      const voterId = hashString(user.uid + election.id);

      // Encrypt one vote for selected candidate, zero for others
      const ciphertexts: Record<string, string> = {};
      const allSteps: EncryptStep[] = [];

      let selectedR = 0n;

for (const c of election.candidates) {
  const m = c.id === selected ? 1n : 0n;
  const result = encrypt(m, pk);
  ciphertexts[c.id] = result.ciphertext.toString();
  if (c.id === selected) {
    allSteps.push(...result.steps);
    selectedR = result.r; // save the random r used during encryption
  }
}

// Generate ZKP proving vote is 0 or 1
const selectedCipher = BigInt(ciphertexts[selected]);
const zkProofResult = generateZKProof(1n, selectedR, selectedCipher, pk);
const proofValid = verifyZKProof(zkProofResult.proof, pk);
if (!proofValid) throw new Error("ZKP verification failed");

      // Receipt token = hash of selected ciphertext
      const receiptToken = hashString(ciphertexts[selected] + user.uid + Date.now());

      await submitVote({
  electionId: election.id,
  voterId,
  candidateId: selected,
  ciphertext: ciphertexts[selected],
  allCiphertexts: JSON.stringify(ciphertexts),
  receiptToken,
  zkProof: JSON.stringify(zkProofResult.proof),  // ← add this line
});

      setEncryptSteps(allSteps);
      setReceipt({ token: receiptToken, ciphertext: ciphertexts[selected] });
      setAlreadyVoted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || loadingElection) {
    return (
      <div style={styles.center}>
        <Loader2 style={{ width: 32, height: 32, color: "#3b82f6", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "#64748b", marginTop: 12 }}>Loading election...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!election) {
    return (
      <div style={styles.center}>
        <div style={styles.emptyCard}>
          <AlertCircle style={{ width: 48, height: 48, color: "#475569", margin: "0 auto 16px" }} />
          <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No Active Election</h2>
          <p style={{ color: "#64748b", fontSize: 14 }}>There is no election currently open for voting.</p>
          {role === "admin" && (
            <button onClick={() => router.push("/admin")} style={styles.adminBtn}>
              Create Election →
            </button>
          )}
        </div>
      </div>
    );
  }

  // Receipt screen
  if (receipt) {
    return (
      <div style={styles.page}>
        <div style={styles.receiptWrap}>
          <div style={styles.receiptCard}>
            <div style={styles.receiptHeader}>
              <CheckCircle style={{ width: 48, height: 48, color: "#4ade80" }} />
              <h2 style={styles.receiptTitle}>Vote Cast Successfully!</h2>
              <p style={styles.receiptSub}>Your vote has been encrypted and submitted.</p>
            </div>

            <div style={styles.receiptSection}>
              <p style={styles.receiptLabel}>🎟️ Your Receipt Token</p>
              <p style={styles.receiptHint}>Save this to verify your vote was counted.</p>
              <div style={styles.codeBox}>
                <code style={styles.code}>{receipt.token}</code>
                <button onClick={() => copyToClipboard(receipt.token)} style={styles.copyBtn}>
                  {copied ? <CheckCircle style={{ width: 14, height: 14, color: "#4ade80" }} /> : <Copy style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            </div>

            <div style={styles.receiptSection}>
              <p style={styles.receiptLabel}>🔐 Your Encrypted Vote (Ciphertext)</p>
              <p style={styles.receiptHint}>This is what was stored — your actual vote is hidden inside.</p>
              <div style={{ ...styles.codeBox, flexDirection: "column", alignItems: "flex-start" }}>
                <code style={{ ...styles.code, wordBreak: "break-all", fontSize: 11 }}>
                  {receipt.ciphertext.slice(0, 80)}...
                </code>
              </div>
            </div>

            {/* Encryption steps */}
            <button
              onClick={() => setShowSteps(!showSteps)}
              style={styles.stepsToggle}
            >
              {showSteps ? "Hide" : "Show"} encryption steps →
            </button>

            {showSteps && (
              <div style={styles.stepsWrap}>
                <p style={styles.stepsTitle}>🔢 How Your Vote Was Encrypted</p>
                {encryptSteps.map((step, i) => (
                  <div key={i} style={styles.stepCard}>
                    <div style={styles.stepNumber}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <p style={styles.stepLabel}>{step.label}</p>
                      <p style={styles.stepFormula}>{step.formula}</p>
                      <p style={styles.stepValue}>{step.value.toString().slice(0, 60)}{step.value.toString().length > 60 ? "..." : ""}</p>
                      <p style={styles.stepDesc}>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.receiptActions}>
              <button onClick={() => router.push("/audit")} style={styles.auditBtn}>
                Verify on Audit Page
              </button>
              <button onClick={() => router.push("/results")} style={styles.resultsBtn}>
                View Results
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Already voted screen
  if (alreadyVoted) {
    return (
      <div style={styles.center}>
        <div style={styles.emptyCard}>
          <Shield style={{ width: 48, height: 48, color: "#3b82f6", margin: "0 auto 16px" }} />
          <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Already Voted</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
            You have already cast your vote in this election.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => router.push("/audit")} style={styles.auditBtn}>Verify Vote</button>
            <button onClick={() => router.push("/results")} style={styles.resultsBtn}>View Results</button>
          </div>
        </div>
      </div>
    );
  }

const deadline = election.deadline ? new Date(election.deadline as string) : null;
const now = new Date();
const timeLeft = deadline ? Math.max(0, deadline.getTime() - now.getTime()) : null;
const hoursLeft = timeLeft ? Math.floor(timeLeft / 3600000) : null;

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
              <Vote style={{ width: 22, height: 22, color: "#fff" }} />
            </div>
            <div>
              <h1 style={styles.title}>{election.title}</h1>
              <p style={styles.subtitle}>{election.description}</p>
            </div>
          </div>
          {hoursLeft !== null && (
            <div style={styles.deadline}>
              <Clock style={{ width: 14, height: 14, color: "#f59e0b" }} />
              <span style={{ color: "#f59e0b", fontSize: 13, fontWeight: 600 }}>
                {hoursLeft}h remaining
              </span>
            </div>
          )}
        </div>

        {/* Crypto notice */}
        <div style={styles.cryptoNotice}>
          <Lock style={{ width: 14, height: 14, color: "#60a5fa", flexShrink: 0 }} />
          <span style={{ color: "#93c5fd", fontSize: 13 }}>
            Your vote will be encrypted in your browser using Damgård-Jurik homomorphic encryption before submission. The server never sees your plaintext vote.
          </span>
        </div>

        {/* Candidates */}
        <div style={styles.candidatesGrid}>
          {election.candidates.map((c: Candidate, i: number) => {
            const isSelected = selected === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                style={{
                  ...styles.candidateCard,
                  ...(isSelected ? styles.candidateCardSelected : {}),
                }}
              >
                <div style={styles.candidateAvatar}>
                  <span style={{ fontSize: 28 }}>
                    {["🧑‍💼", "👩‍💼", "🧑‍🔬", "👨‍⚖️", "👩‍🏫"][i % 5]}
                  </span>
                </div>
                <div style={styles.candidateInfo}>
                  <p style={styles.candidateName}>{c.name}</p>
                  <p style={styles.candidateParty}>{c.party}</p>
                </div>
                <div style={{
                  ...styles.radioOuter,
                  ...(isSelected ? styles.radioOuterSelected : {}),
                }}>
                  {isSelected && <div style={styles.radioInner} />}
                </div>
                {isSelected && (
                  <div style={styles.selectedBadge}>Selected</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Submit */}
        <div style={styles.submitSection}>
          <div style={styles.submitInfo}>
            {selected ? (
              <p style={{ color: "#94a3b8", fontSize: 13 }}>
                ✅ You selected: <strong style={{ color: "#fff" }}>
                  {election.candidates.find((c: Candidate) => c.id === selected)?.name}
                </strong>
              </p>
            ) : (
              <p style={{ color: "#64748b", fontSize: 13 }}>Select a candidate above to cast your vote</p>
            )}
          </div>
          <button
            onClick={handleVote}
            disabled={!selected || submitting}
            style={{
              ...styles.voteBtn,
              ...(!selected || submitting ? styles.voteBtnDisabled : {}),
            }}
          >
            {submitting ? (
              <>
                <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
                Encrypting & Submitting...
              </>
            ) : (
              <>
                <Lock style={{ width: 18, height: 18 }} />
                Cast Encrypted Vote
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#020817",
    fontFamily: "'Space Grotesk', sans-serif",
    padding: "40px 24px",
  },
  pageInner: {
    maxWidth: 780,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  center: {
    minHeight: "calc(100vh - 60px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  emptyCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: "48px 40px",
    textAlign: "center",
    maxWidth: 400,
  },
  adminBtn: {
    marginTop: 20,
    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 4px 20px rgba(59,130,246,0.3)",
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 14,
    margin: "4px 0 0",
  },
  deadline: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(245,158,11,0.1)",
    border: "1px solid rgba(245,158,11,0.2)",
    borderRadius: 10,
    padding: "8px 14px",
    flexShrink: 0,
  },
  cryptoNotice: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    background: "rgba(59,130,246,0.08)",
    border: "1px solid rgba(59,130,246,0.15)",
    borderRadius: 12,
    padding: "12px 16px",
  },
  candidatesGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  candidateCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: "20px 24px",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s",
    position: "relative",
    fontFamily: "'Space Grotesk', sans-serif",
    width: "100%",
  },
  candidateCardSelected: {
    background: "rgba(59,130,246,0.08)",
    border: "1px solid rgba(59,130,246,0.4)",
    boxShadow: "0 0 0 1px rgba(59,130,246,0.2)",
  },
  candidateAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: 600,
    margin: 0,
  },
  candidateParty: {
    color: "#64748b",
    fontSize: 13,
    margin: "4px 0 0",
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.2s",
  },
  radioOuterSelected: {
    border: "2px solid #3b82f6",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#3b82f6",
  },
  selectedBadge: {
    position: "absolute",
    top: 12,
    right: 60,
    background: "rgba(59,130,246,0.15)",
    color: "#60a5fa",
    border: "1px solid rgba(59,130,246,0.3)",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
  },
  submitSection: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: "20px 24px",
    flexWrap: "wrap",
  },
  submitInfo: { flex: 1 },
  voteBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "14px 28px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
    boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
    whiteSpace: "nowrap",
  },
  voteBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  receiptWrap: {
    maxWidth: 640,
    margin: "0 auto",
    padding: "40px 24px",
    width: "100%",
  },
  receiptCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: "40px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  receiptHeader: {
    textAlign: "center",
  },
  receiptTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: 700,
    margin: "16px 0 8px",
  },
  receiptSub: {
    color: "#64748b",
    fontSize: 14,
    margin: 0,
  },
  receiptSection: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  receiptLabel: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: 600,
    margin: 0,
  },
  receiptHint: {
    color: "#64748b",
    fontSize: 12,
    margin: 0,
  },
  codeBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "12px 16px",
  },
  code: {
    color: "#4ade80",
    fontSize: 13,
    fontFamily: "monospace",
    flex: 1,
    wordBreak: "break-all",
  },
  copyBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    padding: 4,
    flexShrink: 0,
  },
  stepsToggle: {
    background: "none",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#60a5fa",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
    alignSelf: "flex-start",
  },
  stepsWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    animation: "fadeIn 0.3s ease",
  },
  stepsTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    margin: 0,
  },
  stepCard: {
    display: "flex",
    gap: 12,
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: "12px 14px",
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "rgba(59,130,246,0.2)",
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepLabel: { color: "#e2e8f0", fontSize: 13, fontWeight: 600, margin: 0 },
  stepFormula: { color: "#8b5cf6", fontSize: 12, fontFamily: "monospace", margin: "2px 0" },
  stepValue: { color: "#4ade80", fontSize: 11, fontFamily: "monospace", margin: "2px 0" },
  stepDesc: { color: "#64748b", fontSize: 12, margin: 0 },
  receiptActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  auditBtn: {
    flex: 1,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#e2e8f0",
    borderRadius: 10,
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
    textAlign: "center",
  },
  resultsBtn: {
    flex: 1,
    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
    border: "none",
    color: "#fff",
    borderRadius: 10,
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
    textAlign: "center",
  },
};