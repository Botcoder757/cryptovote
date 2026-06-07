"use client";
import { useState } from "react";
import { generateKeyPair, encrypt, homomorphicAdd, decrypt, serializePublicKey, serializePrivateKey } from "@/lib/crypto/damgardJurik";
import { Play, Key, Plus, Unlock, ChevronDown, ChevronUp, Zap } from "lucide-react";

interface Step {
  label: string;
  formula: string;
  value: string;
  description: string;
}

export default function PlaygroundPage() {
  const [kp, setKp] = useState<{ pub: Record<string,string>; priv: Record<string,string> } | null>(null);
  const [rawKp, setRawKp] = useState<ReturnType<typeof generateKeyPair> | null>(null);
  const [keySteps, setKeySteps] = useState<Step[]>([]);
  const [showKeySteps, setShowKeySteps] = useState(false);

  const [votes, setVotes] = useState<string[]>(["1", "0", "1"]);
  const [encResults, setEncResults] = useState<{ value: string; steps: Step[] }[]>([]);
  const [encDone, setEncDone] = useState(false);

  const [tallyResult, setTallyResult] = useState<string | null>(null);
  const [tallySteps, setTallySteps] = useState<Step[]>([]);
  const [decryptResult, setDecryptResult] = useState<string | null>(null);
  const [decSteps, setDecSteps] = useState<Step[]>([]);

  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  function handleKeygen() {
    const kpRaw = generateKeyPair();
    setRawKp(kpRaw);
    setKp({ pub: serializePublicKey(kpRaw.publicKey), priv: serializePrivateKey(kpRaw.privateKey) });
    setKeySteps(kpRaw.steps);
    setEncResults([]);
    setEncDone(false);
    setTallyResult(null);
    setDecryptResult(null);
  }

  function handleEncrypt() {
    if (!rawKp) return;
    const results = votes.map(v => {
      const r = encrypt(BigInt(v === "1" ? 1 : 0), rawKp.publicKey);
      return { value: r.ciphertext.toString(), steps: r.steps };
    });
    setEncResults(results);
    setEncDone(true);
    setTallyResult(null);
    setDecryptResult(null);
  }

  function handleTally() {
    if (!rawKp || encResults.length === 0) return;
    const ciphers = encResults.map(r => BigInt(r.value));
    const { combined, steps } = homomorphicAdd(ciphers, rawKp.publicKey);
    setTallyResult(combined.toString());
    setTallySteps(steps);
    setDecryptResult(null);
  }

  function handleDecrypt() {
    if (!rawKp || !tallyResult) return;
    const { plaintext, steps } = decrypt(BigInt(tallyResult), rawKp.privateKey);
    setDecryptResult(plaintext.toString());
    setDecSteps(steps);
  }

  function addVote() { setVotes([...votes, "1"]); setEncDone(false); }
  function removeVote(i: number) { setVotes(votes.filter((_, j) => j !== i)); setEncDone(false); }
  function toggleVote(i: number) {
    setVotes(votes.map((v, j) => j === i ? (v === "1" ? "0" : "1") : v));
    setEncDone(false);
  }

  const expected = votes.filter(v => v === "1").length;

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
      `}</style>
      <div style={S.inner}>
        <div style={S.header}>
          <div style={S.iconBox}><Zap style={{ width: 22, height: 22, color: "#fff" }} /></div>
          <div>
            <h1 style={S.title}>Crypto Playground</h1>
            <p style={S.sub}>Interactive Damgård-Jurik step-by-step demo</p>
          </div>
        </div>

        <div style={S.pipeline}>
          {["1. Keygen", "2. Encrypt", "3. Homomorphic Add", "4. Decrypt"].map((label, i) => {
            const done = [!!kp, encDone, !!tallyResult, !!decryptResult][i];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ ...S.pipeStep, ...(done ? S.pipeStepDone : {}) }}>
                  {done ? "✓" : i + 1}
                  <span style={{ fontSize: 11, marginLeft: 6 }}>{label.slice(3)}</span>
                </div>
                {i < 3 && <div style={{ ...S.pipeLine, ...(done ? S.pipeLineDone : {}) }} />}
              </div>
            );
          })}
        </div>

        {/* Step 1 - Keygen */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={{ ...S.stepBadge, background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>Step 1</div>
            <Key style={{ width: 16, height: 16, color: "#a78bfa" }} />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Key Generation</span>
            {kp && <span style={S.doneBadge}>✓ Done</span>}
          </div>
          <p style={S.cardDesc}>Generate a Damgård-Jurik public/private keypair. The public key encrypts, the private key decrypts.</p>
          <button onClick={handleKeygen} style={S.purpleBtn}>
            <Key style={{ width: 15, height: 15 }} /> Generate Keypair
          </button>
          {kp && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, animation: "fadeIn 0.3s ease" }}>
              <div style={S.keyRow}>
                <span style={{ color: "#60a5fa", fontSize: 12, fontWeight: 600 }}>n =</span>
                <code style={S.keyVal}>{kp.pub.n.slice(0, 60)}...</code>
              </div>
              <div style={S.keyRow}>
                <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600 }}>λ =</span>
                <code style={{ ...S.keyVal, color: "#fbbf24" }}>{kp.priv.lambda?.slice(0, 60)}...</code>
              </div>
              <button onClick={() => setShowKeySteps(!showKeySteps)} style={S.toggleBtn}>
                {showKeySteps ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
                {showKeySteps ? "Hide" : "Show"} {keySteps.length} generation steps
              </button>
              {showKeySteps && <StepList steps={keySteps} expandedStep={expandedStep} setExpandedStep={setExpandedStep} color="#a78bfa" />}
            </div>
          )}
        </div>

        {/* Step 2 - Encrypt */}
        <div style={{ ...S.card, opacity: kp ? 1 : 0.4, pointerEvents: kp ? "auto" : "none" }}>
          <div style={S.cardHeader}>
            <div style={{ ...S.stepBadge, background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>Step 2</div>
            <Play style={{ width: 16, height: 16, color: "#60a5fa" }} />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Encrypt Votes</span>
            {encDone && <span style={S.doneBadge}>✓ Done</span>}
          </div>
          <p style={S.cardDesc}>Each vote (1 = yes, 0 = no) is encrypted independently using the public key.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {votes.map((v, i) => (
              <div key={i} style={S.voteRow}>
                <span style={{ color: "#64748b", fontSize: 13, width: 60 }}>Voter {i + 1}</span>
                <button onClick={() => toggleVote(i)} style={{ ...S.voteToggle, background: v === "1" ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.1)", border: `1px solid ${v === "1" ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.2)"}`, color: v === "1" ? "#4ade80" : "#f87171" }}>
                  m = {v} {v === "1" ? "(votes YES)" : "(votes NO)"}
                </button>
                {encResults[i] && (
                  <code style={S.miniCipher}>{encResults[i].value.slice(0, 30)}...</code>
                )}
                {votes.length > 1 && (
                  <button onClick={() => removeVote(i)} style={S.removeBtn}>✕</button>
                )}
              </div>
            ))}
            <button onClick={addVote} style={S.addBtn}><Plus style={{ width: 13, height: 13 }} /> Add voter</button>
          </div>

          <button onClick={handleEncrypt} style={S.blueBtn}>
            <Play style={{ width: 15, height: 15 }} /> Encrypt All Votes
          </button>

          {encDone && encResults.length > 0 && (
            <div style={{ marginTop: 14, animation: "fadeIn 0.3s ease" }}>
              <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 8px" }}>Click any vote to see its encryption steps:</p>
              {encResults.map((r, i) => (
                <div key={i} style={S.encResultRow}>
                  <span style={{ color: votes[i] === "1" ? "#4ade80" : "#f87171", fontSize: 12, fontWeight: 600, width: 60 }}>Vote {i+1}</span>
                  <code style={S.encCipher}>{r.value.slice(0, 50)}...</code>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 3 - Homomorphic Add */}
        <div style={{ ...S.card, opacity: encDone ? 1 : 0.4, pointerEvents: encDone ? "auto" : "none" }}>
          <div style={S.cardHeader}>
            <div style={{ ...S.stepBadge, background: "rgba(16,185,129,0.15)", color: "#34d399" }}>Step 3</div>
            <Plus style={{ width: 16, height: 16, color: "#34d399" }} />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Homomorphic Addition</span>
            {tallyResult && <span style={S.doneBadge}>✓ Done</span>}
          </div>
          <p style={S.cardDesc}>Multiply all ciphertexts together mod n². No key needed — this is the magic of homomorphic encryption.</p>
          <div style={S.mathBox}>
            <code style={{ color: "#94a3b8", fontSize: 12 }}>
              C_total = C₁ × C₂ {votes.length > 2 ? `× ... × C${votes.length}` : ""} mod n²
            </code>
          </div>
          <button onClick={handleTally} style={S.greenBtn}>
            <Plus style={{ width: 15, height: 15 }} /> Compute Homomorphic Sum
          </button>
          {tallyResult && (
            <div style={{ marginTop: 14, animation: "fadeIn 0.3s ease" }}>
              <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 6px" }}>Combined ciphertext:</p>
              <div style={S.cipherBox}>
                <code style={{ color: "#34d399", fontSize: 11, wordBreak: "break-all" }}>{tallyResult.slice(0, 100)}...</code>
              </div>
            </div>
          )}
        </div>

        {/* Step 4 - Decrypt */}
        <div style={{ ...S.card, opacity: tallyResult ? 1 : 0.4, pointerEvents: tallyResult ? "auto" : "none" }}>
          <div style={S.cardHeader}>
            <div style={{ ...S.stepBadge, background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>Step 4</div>
            <Unlock style={{ width: 16, height: 16, color: "#fbbf24" }} />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Decrypt Tally</span>
            {decryptResult !== null && <span style={S.doneBadge}>✓ Done</span>}
          </div>
          <p style={S.cardDesc}>Use the private key to decrypt only the final sum — individual votes stay hidden forever.</p>
          <button onClick={handleDecrypt} style={S.amberBtn}>
            <Unlock style={{ width: 15, height: 15 }} /> Decrypt Final Tally
          </button>
          {decryptResult !== null && (
            <div style={{ marginTop: 20, animation: "fadeIn 0.3s ease" }}>
              <div style={S.resultBox}>
                <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 8px" }}>Final tally result:</p>
                <p style={{ color: "#fbbf24", fontSize: 48, fontWeight: 700, margin: 0 }}>{decryptResult}</p>
                <p style={{ color: "#64748b", fontSize: 13, margin: "8px 0 0" }}>
                  out of {votes.length} votes cast
                </p>
                {decryptResult === String(expected) ? (
                  <div style={S.correctBadge}>✓ Matches expected count ({expected} YES votes)</div>
                ) : (
                  <div style={S.wrongBadge}>Mismatch — expected {expected}</div>
                )}
              </div>
              {decSteps.length > 0 && (
                <>
                  <button onClick={() => setShowKeySteps(p => !p)} style={{ ...S.toggleBtn, marginTop: 12 }}>
                    {showKeySteps ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
                    Show decryption steps
                  </button>
                  {showKeySteps && <StepList steps={decSteps} expandedStep={expandedStep} setExpandedStep={setExpandedStep} color="#fbbf24" />}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepList({ steps, expandedStep, setExpandedStep, color }: { steps: Step[]; expandedStep: number | null; setExpandedStep: (i: number | null) => void; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, overflow: "hidden" }}>
          <button onClick={() => setExpandedStep(expandedStep === i ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: `${color}20`, color, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
            <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, flex: 1 }}>{step.label}</span>
            <code style={{ color, fontSize: 11, fontFamily: "monospace" }}>{step.formula}</code>
          </button>
          {expandedStep === i && (
            <div style={{ padding: "0 12px 12px 42px", animation: "fadeIn 0.2s ease" }}>
              <code style={{ display: "block", color: "#4ade80", fontSize: 11, fontFamily: "monospace", wordBreak: "break-all", marginBottom: 6 }}>= {String(step.value).slice(0, 80)}{String(step.value).length > 80 ? "..." : ""}</code>
              <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>{step.description}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#020817", fontFamily: "'Space Grotesk',sans-serif", padding: "40px 24px" },
  inner: { maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 },
  header: { display: "flex", alignItems: "center", gap: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#f59e0b,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 },
  sub: { color: "#64748b", fontSize: 13, margin: "4px 0 0" },
  pipeline: { display: "flex", alignItems: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 20px", flexWrap: "wrap", gap: 4 },
  pipeStep: { display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", color: "#64748b", fontSize: 12, fontWeight: 600 },
  pipeStepDone: { background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" },
  pipeLine: { width: 24, height: 2, background: "rgba(255,255,255,0.08)", flexShrink: 0 },
  pipeLineDone: { background: "rgba(74,222,128,0.4)" },
  card: { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 12 },
  cardHeader: { display: "flex", alignItems: "center", gap: 10 },
  cardDesc: { color: "#64748b", fontSize: 13, margin: 0 },
  stepBadge: { padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 },
  doneBadge: { marginLeft: "auto", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600 },
  keyRow: { display: "flex", alignItems: "center", gap: 10 },
  keyVal: { color: "#60a5fa", fontSize: 11, fontFamily: "monospace", background: "rgba(0,0,0,0.3)", padding: "4px 10px", borderRadius: 6, wordBreak: "break-all", flex: 1 },
  toggleBtn: { display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 14px", color: "#60a5fa", fontSize: 12, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", alignSelf: "flex-start" },
  voteRow: { display: "flex", alignItems: "center", gap: 10 },
  voteToggle: { padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif" },
  miniCipher: { color: "#334155", fontSize: 10, fontFamily: "monospace", flex: 1, overflow: "hidden" },
  removeBtn: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "4px 8px", color: "#f87171", cursor: "pointer", fontSize: 11 },
  addBtn: { display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 14px", color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", alignSelf: "flex-start" },
  encResultRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  encCipher: { color: "#475569", fontSize: 11, fontFamily: "monospace", flex: 1 },
  mathBox: { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 14px" },
  cipherBox: { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px" },
  resultBox: { background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 14, padding: 24, textAlign: "center" },
  correctBadge: { marginTop: 12, display: "inline-block", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600 },
  wrongBadge: { marginTop: 12, display: "inline-block", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", borderRadius: 8, padding: "6px 14px", fontSize: 13 },
  purpleBtn: { display: "flex", alignItems: "center", gap: 8, background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 10, padding: "11px 18px", color: "#a78bfa", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", alignSelf: "flex-start" },
  blueBtn: { display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#3b82f6,#6366f1)", border: "none", borderRadius: 10, padding: "11px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", alignSelf: "flex-start" },
  greenBtn: { display: "flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "11px 18px", color: "#34d399", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", alignSelf: "flex-start" },
  amberBtn: { display: "flex", alignItems: "center", gap: 8, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: "11px 18px", color: "#fbbf24", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", alignSelf: "flex-start" },
};