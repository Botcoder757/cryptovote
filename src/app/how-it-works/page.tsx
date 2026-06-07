"use client";
import { Shield, Lock, Plus, Unlock, Eye, EyeOff, CheckCircle, Key, Vote, BarChart3 } from "lucide-react";

const sections = [
  {
    icon: Vote,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.2)",
    title: "1. Voter casts a ballot",
    summary: "You pick a candidate. Your browser encrypts your vote instantly using the election's public key before it ever leaves your device.",
    detail: "The plaintext value m = 1 (your chosen candidate) or m = 0 (others) is passed into the Damgård-Jurik encryption function. A random blinding factor r is chosen, and the ciphertext C = gᵐ · rⁿˢ mod nˢ⁺¹ is computed entirely in JavaScript in your browser.",
    math: "C = gᵐ · rⁿˢ mod nˢ⁺¹",
    badge: "Client-side only",
    badgeColor: "#4ade80",
  },
  {
    icon: Shield,
    color: "#6366f1",
    bg: "rgba(99,102,241,0.1)",
    border: "rgba(99,102,241,0.2)",
    title: "2. Encrypted vote is stored",
    summary: "The server receives only the ciphertext — a massive number that reveals nothing about your vote. It's stored on Firestore alongside your receipt token.",
    detail: "The ciphertext is a BigInt value hundreds of digits long. Without the private key λ, it is computationally infeasible to determine whether m = 0 or m = 1. The server never sees your plaintext vote.",
    math: "Firestore ← { ciphertext: C, receiptToken: H(C || uid || t) }",
    badge: "Server never decrypts",
    badgeColor: "#a78bfa",
  },
  {
    icon: Plus,
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
    title: "3. Homomorphic addition",
    summary: "To tally, all ciphertexts are multiplied together mod n². No key needed — this is the core property of Damgård-Jurik.",
    detail: "Because of the structure of the Paillier/Damgård-Jurik cryptosystem, multiplying ciphertexts corresponds to adding plaintexts. So C₁ × C₂ × ... × Cₙ mod n² decrypts to m₁ + m₂ + ... + mₙ — the total vote count.",
    math: "C_total = C₁ × C₂ × ... × Cₙ mod n²",
    badge: "No key required",
    badgeColor: "#34d399",
  },
  {
    icon: Unlock,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
    title: "4. Admin decrypts the total",
    summary: "The admin enters their private key once to decrypt only the final combined ciphertext, revealing the total count per candidate.",
    detail: "Decryption uses the private key λ (Carmichael's function of n) and µ. The Paillier L-function L(x) = (x−1)/n is applied: plaintext = L(C_total^λ mod n²) × µ mod n. This gives the exact integer sum.",
    math: "m = L(C^λ mod n²) · µ mod n",
    badge: "Private key used once",
    badgeColor: "#fbbf24",
  },
  {
    icon: Eye,
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.2)",
    title: "5. Public verifiability",
    summary: "Every voter can check their vote was counted using the receipt token. The bulletin board shows all ciphertexts publicly.",
    detail: "After voting, you receive a receipt token — a hash of your ciphertext, user ID, and timestamp. You can paste this into the Audit page to verify your encrypted vote exists on the bulletin board and was included in the tally.",
    math: "receipt = H(C || uid || timestamp)",
    badge: "Fully auditable",
    badgeColor: "#22d3ee",
  },
  {
    icon: EyeOff,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.2)",
    title: "6. Individual privacy guaranteed",
    summary: "No one — not the admin, not the server, not other voters — can determine how any individual voted.",
    detail: "The random blinding factor r in encryption ensures that even encrypting the same value m twice produces completely different ciphertexts. This property (semantic security / IND-CPA) means ciphertexts are unlinkable and individual votes can never be recovered without the private key — and even then only the sum is meaningful.",
    math: "Enc(m, r₁) ≠ Enc(m, r₂) for r₁ ≠ r₂",
    badge: "IND-CPA secure",
    badgeColor: "#c084fc",
  },
];

const keyProps = [
  { label: "n", desc: "RSA modulus — product of two large primes p and q", color: "#3b82f6" },
  { label: "g", desc: "Generator g = n + 1 in Damgård-Jurik", color: "#6366f1" },
  { label: "n²", desc: "Encryption space — all operations happen mod n²", color: "#8b5cf6" },
  { label: "λ", desc: "Private key — Carmichael's function λ(n) = lcm(p-1, q-1)", color: "#f59e0b" },
  { label: "µ", desc: "Private key component µ = λ⁻¹ mod n", color: "#f59e0b" },
  { label: "r", desc: "Random blinding factor — fresh for every encryption", color: "#10b981" },
];

export default function HowItWorksPage() {
  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={S.inner}>

        {/* Hero */}
        <div style={S.hero}>
          <div style={S.heroIcon}>
            <Shield style={{ width: 32, height: 32, color: "#fff" }} />
          </div>
          <h1 style={S.heroTitle}>How Damgård-Jurik E-Voting Works</h1>
          <p style={S.heroSub}>
            A complete walkthrough of the cryptographic protocol powering this system —
            from ballot encryption to homomorphic tallying.
          </p>
          <div style={S.heroBadges}>
            {["Homomorphic Encryption", "IND-CPA Secure", "Publicly Verifiable", "Zero Knowledge Tally"].map(b => (
              <span key={b} style={S.heroBadge}>{b}</span>
            ))}
          </div>
        </div>

        {/* Overview box */}
        <div style={S.overviewBox}>
          <div style={S.overviewGrid}>
            {[
              { icon: Lock, label: "Votes encrypted", desc: "in your browser, never on server" },
              { icon: Plus, label: "Tallied without decryption", desc: "via homomorphic multiplication" },
              { icon: Key, label: "Private key used once", desc: "only to reveal the final sum" },
              { icon: CheckCircle, label: "Every vote auditable", desc: "via public bulletin board" },
            ].map((item, i) => (
              <div key={i} style={S.overviewItem}>
                <item.icon style={{ width: 20, height: 20, color: "#3b82f6", flexShrink: 0 }} />
                <div>
                  <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>{item.label}</p>
                  <p style={{ color: "#64748b", fontSize: 12, margin: "2px 0 0" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step by step */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sections.map((sec, i) => (
            <div key={i} style={{ ...S.stepCard, background: sec.bg, border: `1px solid ${sec.border}`, animation: `fadeIn 0.4s ease ${i * 0.08}s both` }}>
              <div style={S.stepHeader}>
                <div style={{ ...S.stepIcon, background: `${sec.color}20`, border: `1px solid ${sec.color}30` }}>
                  <sec.icon style={{ width: 20, height: 20, color: sec.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <h2 style={{ color: "#fff", fontSize: 17, fontWeight: 700, margin: 0 }}>{sec.title}</h2>
                    <span style={{ ...S.badge, color: sec.badgeColor, background: `${sec.badgeColor}15`, border: `1px solid ${sec.badgeColor}30` }}>
                      {sec.badge}
                    </span>
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: 13, margin: "6px 0 0", lineHeight: 1.6 }}>{sec.summary}</p>
                </div>
              </div>

              <div style={S.mathBox}>
                <code style={{ color: "#a78bfa", fontSize: 13, fontFamily: "monospace" }}>{sec.math}</code>
              </div>

              <p style={{ color: "#64748b", fontSize: 13, margin: 0, lineHeight: 1.7, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 14 }}>
                {sec.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Key parameters */}
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Key style={{ width: 18, height: 18, color: "#f59e0b" }} />
            <h2 style={{ color: "#fff", fontSize: 17, fontWeight: 700, margin: 0 }}>Key Parameters Reference</h2>
          </div>
          <div style={S.keyGrid}>
            {keyProps.map((k, i) => (
              <div key={i} style={S.keyItem}>
                <code style={{ ...S.keyLabel, color: k.color, borderColor: `${k.color}30`, background: `${k.color}10` }}>{k.label}</code>
                <p style={{ color: "#94a3b8", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{k.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security note */}
        <div style={S.securityCard}>
          <Shield style={{ width: 20, height: 20, color: "#4ade80", flexShrink: 0 }} />
          <div>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: "0 0 6px" }}>Security Assumptions</p>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0, lineHeight: 1.7 }}>
  The security of this system rests on the <strong style={{ color: "#94a3b8" }}>Decisional Composite Residuosity (DCR) assumption</strong> —
  that given a composite n = pq and a random element x in Z*_(n^2), it is computationally hard to decide whether x is an n-th residue mod n^2.
  This is the same hardness assumption underlying the Paillier cryptosystem.
  The scheme is semantically secure (IND-CPA) under this assumption, meaning no polynomial-time adversary can distinguish encryptions of 0 from encryptions of 1.
</p>
          </div>
        </div>

        {/* System flow diagram */}
        <div style={S.card}>
          <h2 style={{ color: "#fff", fontSize: 17, fontWeight: 700, margin: "0 0 20px" }}>System Flow</h2>
          <div style={S.flowRow}>
            {[
              { label: "Voter Browser", sub: "Encrypt(m, pk)", color: "#3b82f6" },
              { label: "→", sub: "ciphertext C", color: "#475569" },
              { label: "Firestore", sub: "Store C", color: "#6366f1" },
              { label: "→", sub: "C₁×C₂×...×Cₙ", color: "#475569" },
              { label: "Admin Panel", sub: "Decrypt(C_total, sk)", color: "#f59e0b" },
              { label: "→", sub: "plaintext sum", color: "#475569" },
              { label: "Results", sub: "vote counts", color: "#10b981" },
            ].map((step, i) => (
              <div key={i} style={{ textAlign: "center", flex: step.label === "→" ? 0 : 1 }}>
                {step.label === "→" ? (
                  <div style={{ color: "#334155", fontSize: 20, padding: "0 4px" }}>→</div>
                ) : (
                  <div style={{ ...S.flowBox, borderColor: `${step.color}30`, background: `${step.color}10` }}>
                    <p style={{ color: step.color, fontSize: 12, fontWeight: 700, margin: 0 }}>{step.label}</p>
                    <p style={{ color: "#64748b", fontSize: 10, margin: "4px 0 0", fontFamily: "monospace" }}>{step.sub}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#020817", fontFamily: "'Space Grotesk',sans-serif", padding: "40px 24px" },
  inner: { maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 },
  hero: { textAlign: "center", padding: "20px 0 10px" },
  heroIcon: { width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 32px rgba(59,130,246,0.3)" },
  heroTitle: { color: "#fff", fontSize: 30, fontWeight: 700, margin: "0 0 12px", letterSpacing: "-0.02em" },
  heroSub: { color: "#64748b", fontSize: 15, margin: "0 auto 20px", maxWidth: 600, lineHeight: 1.7 },
  heroBadges: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" },
  heroBadge: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "5px 12px", color: "#94a3b8", fontSize: 12, fontWeight: 600 },
  overviewBox: { background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 18, padding: "20px 24px" },
  overviewGrid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 },
  overviewItem: { display: "flex", alignItems: "flex-start", gap: 12 },
  stepCard: { borderRadius: 18, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 },
  stepHeader: { display: "flex", alignItems: "flex-start", gap: 16 },
  stepIcon: { width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  badge: { fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "3px 8px" },
  mathBox: { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: "10px 16px" },
  card: { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "24px" },
  keyGrid: { display: "flex", flexDirection: "column", gap: 12 },
  keyItem: { display: "flex", alignItems: "flex-start", gap: 14 },
  keyLabel: { fontFamily: "monospace", fontSize: 14, fontWeight: 700, padding: "4px 12px", borderRadius: 6, border: "1px solid", flexShrink: 0, minWidth: 36, textAlign: "center" },
  securityCard: { display: "flex", gap: 14, background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 18, padding: "22px 24px" },
  flowRow: { display: "flex", alignItems: "center", gap: 4, overflowX: "auto", paddingBottom: 4 },
  flowBox: { border: "1px solid", borderRadius: 10, padding: "10px 12px", minWidth: 90 },
};