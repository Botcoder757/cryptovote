"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createElection, closeElection, getActiveElection, getVotesForElection } from "@/lib/firebase/firestore";
import {
  generateKeyPair, homomorphicAdd, decrypt,
  serializePublicKey, deserializePrivateKey,
  serializePrivateKey
} from "@/lib/crypto/damgardJurik";
import {
  Settings, Plus, Trash2, Key, Lock, Unlock,
  Copy, CheckCircle, Loader2, AlertTriangle, BarChart3, Users
} from "lucide-react";

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
}

export default function AdminPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const [activeElection, setActiveElection] = useState<Election | null>(null);
  const [loadingElection, setLoadingElection] = useState(true);
  const [tab, setTab] = useState<"create" | "manage">("create");

  // Create election form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([
    { id: "c1", name: "", party: "" },
    { id: "c2", name: "", party: "" },
  ]);

  // Keygen
  const [keyPair, setKeyPair] = useState<{ pub: Record<string, string>; priv: Record<string, string> } | null>(null);
  const [keySteps, setKeySteps] = useState<{ label: string; formula: string; value: string; description: string }[]>([]);
  const [showKeySteps, setShowKeySteps] = useState(false);
  const [generatingKeys, setGeneratingKeys] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  // Close election
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");
  const [tallyResults, setTallyResults] = useState<Record<string, number> | null>(null);
  const [voteCount, setVoteCount] = useState(0);

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) router.push("/login");
  }, [user, role, loading, router]);

  useEffect(() => {
    if (role !== "admin") return;
    async function load() {
      const e = await getActiveElection() as Election | null;
      setActiveElection(e);
      setLoadingElection(false);
      if (e) setTab("manage");
    }
    load();
  }, [role]);

  function addCandidate() {
    setCandidates([...candidates, { id: `c${Date.now()}`, name: "", party: "" }]);
  }

  function removeCandidate(id: string) {
    setCandidates(candidates.filter(c => c.id !== id));
  }

  function updateCandidate(id: string, field: "name" | "party", value: string) {
    setCandidates(candidates.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  async function handleGenerateKeys() {
    setGeneratingKeys(true);
    await new Promise(r => setTimeout(r, 100));
    const kp = generateKeyPair();
    setKeyPair({
      pub: serializePublicKey(kp.publicKey),
      priv: serializePrivateKey(kp.privateKey),
    });
    setKeySteps(kp.steps);
    setGeneratingKeys(false);
  }

  async function handleCreateElection() {
    if (!keyPair) return;
    if (!title || !deadline || candidates.some(c => !c.name || !c.party)) return;
    setCreating(true);
    try {
      await createElection({
        title,
        description,
        candidates,
        deadline,
        publicKey: keyPair.pub,
        createdBy: user!.email!,
      });
      setCreated(true);
      const e = await getActiveElection() as Election | null;
      setActiveElection(e);
      setTab("manage");
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleCloseElection() {
    if (!activeElection || !privateKeyInput.trim()) {
      setCloseError("Please enter the private key.");
      return;
    }
    setClosing(true);
    setCloseError("");
    try {
      const votes = await getVotesForElection(activeElection.id);
      setVoteCount(votes.length);

      const pk = activeElection.publicKey;
      const skObj = JSON.parse(privateKeyInput) as Record<string, string>;
      const sk = deserializePrivateKey(skObj);

      // Tally per candidate using homomorphic addition
      // Tally per candidate using homomorphic addition
const results: Record<string, number> = {};
for (const candidate of activeElection.candidates) {
  const ciphertexts: bigint[] = [];

  for (const v of votes as Record<string, unknown>[]) {
    const allCiphertexts = JSON.parse(v.allCiphertexts as string) as Record<string, string>;
    if (allCiphertexts[candidate.id]) {
      ciphertexts.push(BigInt(allCiphertexts[candidate.id]));
    }
  }

  if (ciphertexts.length === 0) {
    results[candidate.id] = 0;
    continue;
  }

  const { combined } = homomorphicAdd(ciphertexts, {
    n: BigInt(pk.n),
    g: BigInt(pk.g),
    nSquared: BigInt(pk.nSquared),
  });
  const { plaintext } = decrypt(combined, sk);
  results[candidate.id] = Number(plaintext);
}

      await closeElection(activeElection.id, results);
      setTallyResults(results);
    } catch (err) {
      setCloseError("Invalid private key or decryption failed. Make sure you paste the full JSON key.");
      console.error(err);
    } finally {
      setClosing(false);
    }
  }

  if (loading || loadingElection) {
    return (
      <div style={styles.center}>
        <Loader2 style={{ width: 32, height: 32, color: "#3b82f6", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        input::placeholder, textarea::placeholder { color: #475569; }
        input:focus, textarea:focus { outline: none; border-color: #3b82f6 !important; }
      `}</style>

      <div style={styles.pageInner}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <Settings style={{ width: 22, height: 22, color: "#fff" }} />
          </div>
          <div>
            <h1 style={styles.title}>Admin Panel</h1>
            <p style={styles.subtitle}>Manage elections and cryptographic keys</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabRow}>
          {(["create", "manage"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ ...styles.tabBtn, ...(tab === t ? styles.tabBtnActive : {}) }}>
              {t === "create" ? "➕ Create Election" : "⚙️ Manage Election"}
            </button>
          ))}
        </div>

        {/* ── CREATE TAB ── */}
        {tab === "create" && (
          <div style={styles.card}>
            {created ? (
              <div style={styles.successBox}>
                <CheckCircle style={{ width: 48, height: 48, color: "#4ade80", margin: "0 auto 16px" }} />
                <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Election Created!</h3>
                <p style={{ color: "#64748b", margin: 0 }}>The election is now live. Voters can start casting encrypted votes.</p>
                <button onClick={() => setTab("manage")} style={styles.primaryBtn}>
                  Go to Manage →
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Step 1 — Details */}
                <div>
                  <p style={styles.sectionLabel}>Step 1 — Election Details</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <input
                      type="text"
                      placeholder="Election title (e.g. Student Council President 2024)"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      style={styles.input}
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={2}
                      style={{ ...styles.input, resize: "vertical" }}
                    />
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Step 2 — Candidates */}
                <div>
                  <p style={styles.sectionLabel}>Step 2 — Candidates</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {candidates.map((c, i) => (
                      <div key={c.id} style={styles.candidateRow}>
                        <span style={styles.candidateNum}>{i + 1}</span>
                        <input
                          placeholder="Candidate name"
                          value={c.name}
                          onChange={e => updateCandidate(c.id, "name", e.target.value)}
                          style={{ ...styles.input, flex: 1, margin: 0 }}
                        />
                        <input
                          placeholder="Party / Role"
                          value={c.party}
                          onChange={e => updateCandidate(c.id, "party", e.target.value)}
                          style={{ ...styles.input, flex: 1, margin: 0 }}
                        />
                        {candidates.length > 2 && (
                          <button onClick={() => removeCandidate(c.id)} style={styles.removeBtn}>
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={addCandidate} style={styles.addCandidateBtn}>
                      <Plus style={{ width: 14, height: 14 }} /> Add Candidate
                    </button>
                  </div>
                </div>

                {/* Step 3 — Key Generation */}
                <div>
                  <p style={styles.sectionLabel}>Step 3 — Generate Cryptographic Keys</p>
                  <p style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>
                    This generates a Damgård-Jurik keypair. The public key is stored with the election.
                    <strong style={{ color: "#f59e0b" }}> Save the private key — it is shown only once.</strong>
                  </p>

                  <button onClick={handleGenerateKeys} disabled={generatingKeys} style={styles.keyGenBtn}>
                    {generatingKeys
                      ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Generating...</>
                      : <><Key style={{ width: 16, height: 16 }} /> Generate Keypair</>
                    }
                  </button>

                  {keyPair && (
                    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn 0.3s ease" }}>
                      {/* Public Key */}
                      <div style={styles.keyBox}>
                        <div style={styles.keyBoxHeader}>
                          <span style={{ color: "#60a5fa", fontWeight: 600, fontSize: 13 }}>🔵 Public Key (stored with election)</span>
                        </div>
                        <code style={styles.keyCode}>{JSON.stringify(keyPair.pub, null, 2)}</code>
                      </div>

                      {/* Private Key */}
                      <div style={{ ...styles.keyBox, borderColor: "rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.05)" }}>
                        <div style={styles.keyBoxHeader}>
                          <span style={{ color: "#fbbf24", fontWeight: 600, fontSize: 13 }}>🔴 Private Key — SAVE THIS NOW</span>
                          <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(keyPair.priv)); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }} style={styles.copyBtn}>
                            {copiedKey ? <CheckCircle style={{ width: 14, height: 14, color: "#4ade80" }} /> : <Copy style={{ width: 14, height: 14 }} />}
                            {copiedKey ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <code style={{ ...styles.keyCode, color: "#fbbf24" }}>{JSON.stringify(keyPair.priv, null, 2)}</code>
                        <p style={{ color: "#92400e", fontSize: 12, margin: "8px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
                          <AlertTriangle style={{ width: 12, height: 12 }} />
                          This will NOT be stored anywhere. Copy it before creating the election.
                        </p>
                      </div>

                      {/* Key gen steps toggle */}
                      <button onClick={() => setShowKeySteps(!showKeySteps)} style={styles.stepsToggle}>
                        {showKeySteps ? "Hide" : "Show"} key generation steps →
                      </button>

                      {showKeySteps && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {keySteps.map((step, i) => (
                            <div key={i} style={styles.stepCard}>
                              <div style={styles.stepNum}>{i + 1}</div>
                              <div>
                                <p style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, margin: 0 }}>{step.label}</p>
                                <p style={{ color: "#8b5cf6", fontSize: 12, fontFamily: "monospace", margin: "2px 0" }}>{step.formula}</p>
                                <p style={{ color: "#4ade80", fontSize: 11, fontFamily: "monospace", margin: "2px 0", wordBreak: "break-all" }}>= {step.value.toString().slice(0, 50)}{step.value.toString().length > 50 ? "..." : ""}</p>
                                <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>{step.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Create Button */}
                <button
                  onClick={handleCreateElection}
                  disabled={!keyPair || !title || !deadline || creating || candidates.some(c => !c.name)}
                  style={{ ...styles.primaryBtn, opacity: (!keyPair || !title || !deadline || creating) ? 0.5 : 1 }}
                >
                  {creating
                    ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Creating...</>
                    : <><Plus style={{ width: 16, height: 16 }} /> Create Election</>
                  }
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── MANAGE TAB ── */}
        {tab === "manage" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {!activeElection ? (
              <div style={styles.card}>
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <BarChart3 style={{ width: 48, height: 48, color: "#475569", margin: "0 auto 16px" }} />
                  <p style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>No Active Election</p>
                  <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>Create an election first.</p>
                  <button onClick={() => setTab("create")} style={{ ...styles.primaryBtn, marginTop: 20 }}>
                    Create Election →
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Election info card */}
                <div style={styles.card}>
                  <div style={styles.electionHeader}>
                    <div>
                      <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 4px" }}>ACTIVE ELECTION</p>
                      <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>{activeElection.title}</h2>
                    </div>
                    <span style={styles.statusBadge}>● Live</span>
                  </div>

                  <div style={styles.candidateList}>
                    <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 10px", fontWeight: 600 }}>CANDIDATES</p>
                    {activeElection.candidates.map((c: Candidate) => (
                      <div key={c.id} style={styles.candidateItem}>
                        <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                        <span style={{ color: "#64748b", fontSize: 13 }}>{c.party}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Close election card */}
                {!tallyResults ? (
                  <div style={styles.card}>
                    <div style={styles.closeHeader}>
                      <Lock style={{ width: 20, height: 20, color: "#f87171" }} />
                      <div>
                        <p style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>Close Election & Tally Votes</p>
                        <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
                          Enter your private key to perform the homomorphic tally and reveal results.
                        </p>
                      </div>
                    </div>

                    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                      <textarea
                        placeholder='Paste your private key JSON here: {"lambda":"...","mu":"...","n":"...","nSquared":"..."}'
                        value={privateKeyInput}
                        onChange={e => setPrivateKeyInput(e.target.value)}
                        rows={4}
                        style={{ ...styles.input, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
                      />

                      {closeError && (
                        <div style={styles.errorBox}>
                          <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                          {closeError}
                        </div>
                      )}

                      <button onClick={handleCloseElection} disabled={closing || !privateKeyInput.trim()} style={{ ...styles.closeBtn, opacity: closing || !privateKeyInput.trim() ? 0.5 : 1 }}>
                        {closing
                          ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Tallying votes...</>
                          : <><Unlock style={{ width: 16, height: 16 }} /> Close & Tally</>
                        }
                      </button>
                    </div>
                  </div>
                ) : (
                  // Results
                  <div style={styles.card}>
                    <div style={{ textAlign: "center", marginBottom: 24 }}>
                      <CheckCircle style={{ width: 48, height: 48, color: "#4ade80", margin: "0 auto 12px" }} />
                      <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Election Closed</h3>
                      <p style={{ color: "#64748b", fontSize: 14 }}>
                        <Users style={{ width: 14, height: 14, display: "inline", marginRight: 4 }} />
                        {voteCount} total votes tallied homomorphically
                      </p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {activeElection.candidates.map((c: Candidate) => {
                        const count = tallyResults[c.id] ?? 0;
                        const total = Object.values(tallyResults).reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const isWinner = count === Math.max(...Object.values(tallyResults));
                        return (
                          <div key={c.id} style={{ ...styles.resultRow, ...(isWinner ? styles.resultRowWinner : {}) }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
                                {isWinner ? "🏆 " : ""}{c.name}
                              </span>
                              <span style={{ color: "#4ade80", fontWeight: 700 }}>{count} votes ({pct}%)</span>
                            </div>
                            <div style={styles.progressBg}>
                              <div style={{ ...styles.progressBar, width: `${pct}%`, background: isWinner ? "linear-gradient(90deg, #3b82f6, #4ade80)" : "rgba(59,130,246,0.5)" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={styles.tallyNote}>
                      <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
                        ✅ Results computed via homomorphic addition: Dec(C₁ × C₂ × ... × Cₙ) — individual votes were never decrypted.
                      </p>
                    </div>

                    <button onClick={async () => { await new Promise(r => setTimeout(r, 2000)); router.push("/results"); }} style={{ ...styles.primaryBtn, marginTop: 16 }}>
  View Full Results Dashboard →
</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#020817", fontFamily: "'Space Grotesk', sans-serif", padding: "40px 24px" },
  pageInner: { maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 },
  center: { minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center" },
  header: { display: "flex", alignItems: "center", gap: 16 },
  headerIcon: { width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #f59e0b, #ef4444)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 20px rgba(245,158,11,0.3)" },
  title: { color: "#fff", fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" },
  subtitle: { color: "#64748b", fontSize: 14, margin: "4px 0 0" },
  tabRow: { display: "flex", gap: 8 },
  tabBtn: { padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  tabBtnActive: { background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#fff" },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px" },
  sectionLabel: { color: "#fff", fontSize: 15, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 },
  input: { width: "100%", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" },
  candidateRow: { display: "flex", alignItems: "center", gap: 10 },
  candidateNum: { width: 28, height: 28, borderRadius: "50%", background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  removeBtn: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  addCandidateBtn: { display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 16px", color: "#64748b", fontSize: 13, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  keyGenBtn: { display: "flex", alignItems: "center", gap: 8, background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 10, padding: "12px 20px", color: "#a78bfa", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  keyBox: { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 12, padding: "16px" },
  keyBoxHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  keyCode: { display: "block", color: "#60a5fa", fontSize: 11, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" },
  copyBtn: { display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 10px", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  stepsToggle: { background: "none", border: "1px solid rgba(255,255,255,0.08)", color: "#60a5fa", borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", alignSelf: "flex-start" },
  stepCard: { display: "flex", gap: 10, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px" },
  stepNum: { width: 22, height: 22, borderRadius: "50%", background: "rgba(139,92,246,0.2)", color: "#a78bfa", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  primaryBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg, #3b82f6, #6366f1)", border: "none", borderRadius: 12, padding: "14px 24px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 4px 20px rgba(59,130,246,0.3)" },
  closeBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg, #ef4444, #dc2626)", border: "none", borderRadius: 12, padding: "14px 24px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  errorBox: { display: "flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13 },
  successBox: { textAlign: "center", padding: "24px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  electionHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  statusBadge: { background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  candidateList: { display: "flex", flexDirection: "column", gap: 8 },
  candidateItem: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 16px" },
  closeHeader: { display: "flex", alignItems: "flex-start", gap: 14 },
  resultRow: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px" },
  resultRowWinner: { background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.25)" },
  progressBg: { height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 3, transition: "width 0.5s ease" },
  tallyNote: { marginTop: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px" },
};