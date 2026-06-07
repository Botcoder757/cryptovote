"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const CIPHERS = [
  "0x4a9f2e8b1c7d3f6a",
  "C = g^m · r^n mod n²",
  "0xe3b0c44298fc1c14",
  "ZKP: c0+c1=Hash(C,a0,a1)",
  "0x9b2e1d8f4c7a3e6b",
  "Enc(0) × Enc(1) = Enc(1)",
  "0x1f4d8c2a9e7b5f3d",
  "λ = lcm(p-1, q-1)",
];

const FEATURES = [
  {
    icon: "⚡",
    title: "Homomorphic Encryption",
    desc: "Votes are tallied while still encrypted. The server performs arithmetic on ciphertexts — your plaintext vote never touches our servers.",
    tag: "Damgård-Jurik",
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.3)",
  },
  {
    icon: "🔍",
    title: "Zero Knowledge Proofs",
    desc: "Every vote carries a cryptographic proof it encodes 0 or 1 — preventing ballot stuffing — without revealing which candidate you chose.",
    tag: "Disjunctive Sigma Protocol",
    color: "#8b5cf6",
    glow: "rgba(139,92,246,0.3)",
  },
  {
    icon: "📋",
    title: "Universal Verifiability",
    desc: "Every encrypted vote is posted to a public bulletin board. Anyone can verify every proof. Nobody can verify who you voted for.",
    tag: "Public Bulletin Board",
    color: "#06b6d4",
    glow: "rgba(6,182,212,0.3)",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Select & Encrypt",
    desc: "Choose your candidate. Your browser encrypts the vote using Damgård-Jurik before it ever leaves your device.",
    icon: "🔐",
    color: "#3b82f6",
  },
  {
    n: "02",
    title: "Prove & Submit",
    desc: "A Zero Knowledge Proof is generated, proving your vote is valid (0 or 1) without revealing your choice. Both are submitted.",
    icon: "✍️",
    color: "#8b5cf6",
  },
  {
    n: "03",
    title: "Tally & Verify",
    desc: "Admin homomorphically adds all ciphertexts and decrypts once to get final totals. Anyone can verify every step.",
    icon: "📊",
    color: "#06b6d4",
  },
];

const TRUST = [
  { label: "Server sees plaintext votes", value: "Never", icon: "🚫" },
  { label: "Vote privacy guaranteed", value: "Always", icon: "🔒" },
  { label: "Results tamper-proof", value: "Mathematically", icon: "📐" },
  { label: "Independently auditable", value: "By anyone", icon: "🌐" },
];

export default function HomePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string }[] = [];
    const colors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#6366f1"];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            setVisibleSections(prev => new Set([...prev, e.target.id]));
          }
        });
      },
      { threshold: 0.15 }
    );
    ["features", "steps", "trust", "cta"].forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [mounted]);

  const isVisible = (id: string) => visibleSections.has(id);

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes float {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(1deg); }
          66% { transform: translateY(-10px) rotate(-1deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes orb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(60px,-40px) scale(1.1); }
        }
        @keyframes orb2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-40px,60px) scale(0.9); }
        }
        @keyframes orb3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(30px,30px) scale(1.05); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .hero-title span {
          background: linear-gradient(135deg, #fff 0%, #93c5fd 40%, #c4b5fd 70%, #67e8f9 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 4s ease infinite;
        }

        .feature-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-8px);
        }

        .cta-primary {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 60px rgba(99,102,241,0.5) !important;
        }
        .cta-secondary {
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .cta-secondary:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.1) !important;
        }

        .step-card {
          transition: transform 0.3s ease;
        }
        .step-card:hover {
          transform: scale(1.02);
        }

        .trust-item {
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .trust-item:hover {
          background: rgba(255,255,255,0.07) !important;
          transform: translateX(4px);
        }

        .reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
      `}</style>

      {/* Canvas background */}
      <canvas ref={canvasRef} style={S.canvas} />

      {/* Background orbs */}
      <div style={{ ...S.orb, ...S.orb1 }} />
      <div style={{ ...S.orb, ...S.orb2 }} />
      <div style={{ ...S.orb, ...S.orb3 }} />

      {/* Noise overlay */}
      <div style={S.noise} />

      {/* ─── NAVBAR ─── */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <div style={S.navLogo}>
            <div style={S.navLogoIcon}>🗳️</div>
            <span style={S.navLogoText}>CryptoVote</span>
          </div>
          <div style={S.navLinks}>
            {["How it Works", "Bulletin", "Results"].map((l, i) => (
              <button key={i} onClick={() => router.push(["/" + l.toLowerCase().replace(/ /g, "-"), "/bulletin", "/results"][i])}
                style={S.navLink}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => router.push("/vote")} style={S.navCta}>
            Vote Now →
          </button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section style={S.hero}>
        {/* Floating cipher decorations */}
        {mounted && CIPHERS.map((c, i) => (
          <div key={i} style={{
            ...S.floatingCipher,
            top: `${10 + (i * 11) % 80}%`,
            left: i % 2 === 0 ? `${2 + (i * 7) % 15}%` : undefined,
            right: i % 2 !== 0 ? `${2 + (i * 7) % 15}%` : undefined,
            animationDelay: `${i * 0.7}s`,
            opacity: 0.12 + (i % 3) * 0.06,
          }}>
            {c}
          </div>
        ))}

        <div style={S.heroContent}>
          {/* Badge */}
          <div style={S.heroBadge}>
            <span style={{ animation: "pulse 2s infinite", display: "inline-block", marginRight: 6 }}>🔐</span>
            Powered by Damgård-Jurik Homomorphic Encryption
          </div>

          {/* Title */}
          <h1 className="hero-title" style={S.heroTitle}>
  <span>Your Vote.</span>
  <br />
  <span style={{ fontSize: "0.85em" }}>Mathematically</span>
  <br />
  <span style={{ fontSize: "0.7em", opacity: 0.8 }}>Unbreakable.</span>
</h1>

          <p style={S.heroSub}>
            Cast your vote privately. Verify it publicly. Trust the math, not the institution.
            Every ballot is encrypted in your browser — the server only sees numbers it can never decode.
          </p>

          <div style={S.heroCtas}>
            <button className="cta-primary" onClick={() => router.push("/vote")} style={S.ctaPrimary}>
              <span>🗳️</span> Cast Your Vote
            </button>
            <button className="cta-secondary" onClick={() => router.push("/how-it-works")} style={S.ctaSecondary}>
              How it Works ↓
            </button>
          </div>

          {/* Mini stats */}
          <div style={S.heroStats}>
            {[
              { label: "Encryption", value: "Damgård-Jurik" },
              { label: "Zero Knowledge", value: "OR-Proof" },
              { label: "Privacy", value: "Mathematical" },
            ].map((s, i) => (
              <div key={i} style={S.heroStat}>
                <span style={S.heroStatValue}>{s.value}</span>
                <span style={S.heroStatLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual */}
        <div style={S.heroVisual}>
          <div style={S.glassCard}>
            <div style={S.glassCardHeader}>
              <div style={{ ...S.dot, background: "#f87171" }} />
              <div style={{ ...S.dot, background: "#fbbf24" }} />
              <div style={{ ...S.dot, background: "#4ade80" }} />
              <span style={S.glassCardTitle}>vote.encrypt()</span>
            </div>
            <div style={S.codeBlock}>
              {[
                { c: "#64748b", t: "// Your vote, before submission" },
                { c: "#4ade80", t: 'plaintext  = "Alice"' },
                { c: "#64748b", t: "" },
                { c: "#64748b", t: "// What the server receives" },
                { c: "#60a5fa", t: "C = g^m · r^n mod n²" },
                { c: "#c4b5fd", t: "= 29610500686253..." },
                { c: "#64748b", t: "" },
                { c: "#64748b", t: "// ZKP proves validity" },
                { c: "#34d399", t: "ZKP.verify(C) → ✅ valid" },
              ].map((line, i) => (
                <div key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: line.c, lineHeight: 1.7, animationDelay: `${i * 0.1}s` }}>
                  {line.t || "\u00A0"}
                </div>
              ))}
            </div>

            <div style={S.glassCardFooter}>
              <div style={S.statusDot} />
              <span style={{ color: "#4ade80", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                ZKP verified · Vote submitted
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TICKER ─── */}
      <div style={S.ticker}>
        <div style={S.tickerTrack}>
          {[...Array(2)].map((_, ri) => (
            <span key={ri} style={{ display: "flex", gap: 48, whiteSpace: "nowrap" }}>
              {["🔐 End-to-end encrypted", "✅ Zero knowledge proofs", "📋 Publicly verifiable", "🔢 Homomorphic tallying", "🛡️ Tamper-proof results", "🌐 Open source audit"].map((t, i) => (
                <span key={i} style={S.tickerItem}>{t}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ─── FEATURES ─── */}
      <section id="features" style={S.section}>
        <div style={S.sectionInner}>
          <div className={`reveal ${isVisible("features") ? "visible" : ""}`} style={S.sectionHeader}>
            <div style={S.sectionTag}>Core Technology</div>
            <h2 style={S.sectionTitle}>Three pillars of cryptographic trust</h2>
            <p style={S.sectionSub}>Every design decision prioritises your privacy and the integrity of the result.</p>
          </div>

          <div style={S.featuresGrid}>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`feature-card reveal reveal-delay-${i + 1} ${isVisible("features") ? "visible" : ""}`}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                style={{
                  ...S.featureCard,
                  boxShadow: hoveredFeature === i ? `0 20px 60px ${f.glow}` : "0 4px 24px rgba(0,0,0,0.3)",
                  borderColor: hoveredFeature === i ? f.color + "60" : "rgba(255,255,255,0.07)",
                }}
              >
                <div style={{ ...S.featureIcon, background: f.color + "20", boxShadow: `0 0 20px ${f.glow}` }}>
                  {f.icon}
                </div>
                <div style={{ ...S.featureTag, color: f.color, borderColor: f.color + "40", background: f.color + "15" }}>
                  {f.tag}
                </div>
                <h3 style={S.featureTitle}>{f.title}</h3>
                <p style={S.featureDesc}>{f.desc}</p>
                <div style={{ ...S.featureBar, background: f.color + "30" }}>
                  <div style={{ ...S.featureBarFill, background: f.color, width: hoveredFeature === i ? "100%" : "40%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STEPS ─── */}
      <section id="steps" style={{ ...S.section, background: "rgba(0,0,0,0.2)" }}>
        <div style={S.sectionInner}>
          <div className={`reveal ${isVisible("steps") ? "visible" : ""}`} style={S.sectionHeader}>
            <div style={S.sectionTag}>The Process</div>
            <h2 style={S.sectionTitle}>Three steps, end to end</h2>
          </div>

          <div style={S.stepsRow}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div
                  className={`step-card reveal reveal-delay-${i + 1} ${isVisible("steps") ? "visible" : ""}`}
                  style={{ ...S.stepCard, flex: 1 }}
                >
                  <div style={{ ...S.stepNum, color: s.color, borderColor: s.color + "40", background: s.color + "15" }}>
                    {s.n}
                  </div>
                  <div style={{ fontSize: 36, margin: "12px 0" }}>{s.icon}</div>
                  <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: "'Syne', sans-serif" }}>{s.title}</h3>
                  <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.7 }}>{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={S.stepArrow}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRUST ─── */}
      <section id="trust" style={S.section}>
        <div style={S.sectionInner}>
          <div style={S.trustLayout}>
            <div className={`reveal ${isVisible("trust") ? "visible" : ""}`} style={S.trustLeft}>
              <div style={S.sectionTag}>Security Model</div>
              <h2 style={{ ...S.sectionTitle, textAlign: "left" }}>
                Trust the math,<br />not the system.
              </h2>
              <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.8, marginTop: 16 }}>
                Traditional voting systems require you to trust administrators, software vendors, and auditors.
                CryptoVote replaces institutional trust with mathematical certainty.
              </p>
              <button className="cta-primary" onClick={() => router.push("/audit")} style={{ ...S.ctaPrimary, marginTop: 28 }}>
                Audit the System →
              </button>
            </div>
            <div className={`reveal reveal-delay-2 ${isVisible("trust") ? "visible" : ""}`} style={S.trustRight}>
              {TRUST.map((t, i) => (
                <div key={i} className="trust-item" style={S.trustItem}>
                  <span style={{ fontSize: 24 }}>{t.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: "#94a3b8", fontSize: 13 }}>{t.label}</p>
                    <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>{t.value}</p>
                  </div>
                  <div style={S.trustCheck}>✓</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section id="cta" style={S.ctaSection}>
        <div className={`reveal ${isVisible("cta") ? "visible" : ""}`} style={S.ctaInner}>
          <div style={S.ctaGlow} />
          <div style={S.sectionTag}>Ready?</div>
          <h2 style={{ ...S.sectionTitle, fontSize: 48 }}>Cast your vote today.</h2>
          <p style={{ color: "#64748b", fontSize: 16, marginTop: 12, marginBottom: 36 }}>
            Takes 30 seconds. Cryptographically secured. Permanently verifiable.
          </p>
          <div style={S.heroCtas}>
            <button className="cta-primary" onClick={() => router.push("/vote")} style={S.ctaPrimary}>
              🗳️ Vote Now
            </button>
            <button className="cta-secondary" onClick={() => router.push("/bulletin")} style={S.ctaSecondary}>
              View Bulletin Board
            </button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div style={S.footerLogo}>
            <span style={{ fontSize: 20 }}>🗳️</span>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "'Syne', sans-serif" }}>CryptoVote</span>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
            {["/vote", "/bulletin", "/results", "/audit", "/how-it-works", "/playground"].map((path, i) => (
              <button key={i} onClick={() => router.push(path)} style={S.footerLink}>
                {["Vote", "Bulletin", "Results", "Audit", "How It Works", "Playground"][i]}
              </button>
            ))}
          </div>
          <p style={S.footerBadge}>
            Built with Damgård-Jurik cryptosystem · ZKP Disjunctive Sigma Protocol
          </p>
        </div>
      </footer>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#020817",
    fontFamily: "'Syne', sans-serif",
    overflowX: "hidden",
    position: "relative",
  },
  canvas: {
    position: "fixed",
    top: 0, left: 0,
    width: "100%", height: "100%",
    pointerEvents: "none",
    zIndex: 0,
  },
  orb: {
    position: "fixed",
    borderRadius: "50%",
    filter: "blur(80px)",
    pointerEvents: "none",
    zIndex: 0,
  },
  orb1: {
    width: 600, height: 600,
    top: -200, left: -200,
    background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
    animation: "orb1 12s ease-in-out infinite",
  },
  orb2: {
    width: 500, height: 500,
    bottom: -100, right: -100,
    background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)",
    animation: "orb2 15s ease-in-out infinite",
  },
  orb3: {
    width: 400, height: 400,
    top: "50%", left: "50%",
    transform: "translate(-50%,-50%)",
    background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
    animation: "orb3 10s ease-in-out infinite",
  },
  noise: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
    pointerEvents: "none",
    zIndex: 1,
    opacity: 0.4,
  },
  nav: {
    position: "fixed",
    top: 0, left: 0, right: 0,
    zIndex: 100,
    padding: "0 24px",
    background: "rgba(2,8,23,0.8)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  navInner: {
    maxWidth: 1200,
    margin: "0 auto",
    height: 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navLogo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  navLogoIcon: { fontSize: 22 },
  navLogoText: {
    color: "#fff",
    fontWeight: 800,
    fontSize: 18,
    letterSpacing: "-0.02em",
  },
  navLinks: {
    display: "flex",
    gap: 4,
  },
  navLink: {
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: 14,
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: 8,
    fontFamily: "'Syne', sans-serif",
    fontWeight: 500,
    transition: "color 0.2s",
  },
  navCta: {
    background: "rgba(99,102,241,0.15)",
    border: "1px solid rgba(99,102,241,0.3)",
    color: "#a5b4fc",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    padding: "8px 16px",
    borderRadius: 10,
    fontFamily: "'Syne', sans-serif",
  },
  hero: {
    position: "relative",
    zIndex: 10,
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: 1200,
    margin: "0 auto",
    padding: "100px 24px 60px",
    gap: 48,
    flexWrap: "wrap",
  },
  heroContent: {
    flex: "1 1 500px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    animation: "fadeUp 0.8s ease both",
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    background: "rgba(99,102,241,0.1)",
    border: "1px solid rgba(99,102,241,0.25)",
    borderRadius: 100,
    padding: "6px 16px",
    color: "#a5b4fc",
    fontSize: 12,
    fontWeight: 600,
    alignSelf: "flex-start",
    fontFamily: "'JetBrains Mono', monospace",
  },
  heroTitle: {
    fontSize: 72,
    fontWeight: 800,
    lineHeight: 1.05,
    letterSpacing: "-0.03em",
    color: "#fff",
  },
  heroSub: {
    color: "#64748b",
    fontSize: 16,
    lineHeight: 1.8,
    maxWidth: 480,
  },
  heroCtas: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  ctaPrimary: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: "14px 28px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Syne', sans-serif",
    boxShadow: "0 8px 32px rgba(99,102,241,0.35)",
  },
  ctaSecondary: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#94a3b8",
    borderRadius: 14,
    padding: "14px 28px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Syne', sans-serif",
  },
  heroStats: {
    display: "flex",
    gap: 32,
    paddingTop: 8,
  },
  heroStat: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  heroStatValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
  },
  heroStatLabel: {
    color: "#475569",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  heroVisual: {
    flex: "0 0 420px",
    animation: "fadeUp 0.8s ease 0.2s both",
  },
  glassCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    backdropFilter: "blur(20px)",
    overflow: "hidden",
    boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
    animation: "float 8s ease-in-out infinite",
  },
  glassCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(0,0,0,0.2)",
  },
  dot: {
    width: 10, height: 10,
    borderRadius: "50%",
  },
  glassCardTitle: {
    color: "#475569",
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    marginLeft: 4,
  },
  codeBlock: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
  },
  glassCardFooter: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 20px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(0,0,0,0.2)",
  },
  statusDot: {
    width: 8, height: 8,
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow: "0 0 8px #4ade80",
    animation: "pulse 2s infinite",
  },
  floatingCipher: {
    position: "absolute",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#6366f1",
    whiteSpace: "nowrap",
    animation: "float 6s ease-in-out infinite",
    pointerEvents: "none",
    userSelect: "none",
  },
  ticker: {
    position: "relative",
    zIndex: 10,
    overflow: "hidden",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    background: "rgba(99,102,241,0.05)",
    padding: "12px 0",
  },
  tickerTrack: {
    display: "flex",
    gap: 48,
    animation: "ticker 20s linear infinite",
    width: "max-content",
  },
  tickerItem: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap",
    fontFamily: "'JetBrains Mono', monospace",
  },
  section: {
    position: "relative",
    zIndex: 10,
    padding: "100px 24px",
  },
  sectionInner: {
    maxWidth: 1200,
    margin: "0 auto",
  },
  sectionHeader: {
    textAlign: "center",
    marginBottom: 60,
  },
  sectionTag: {
    display: "inline-block",
    background: "rgba(99,102,241,0.1)",
    border: "1px solid rgba(99,102,241,0.25)",
    borderRadius: 100,
    padding: "4px 14px",
    color: "#a5b4fc",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: 16,
    fontFamily: "'JetBrains Mono', monospace",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 40,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
    marginBottom: 12,
  },
  sectionSub: {
    color: "#64748b",
    fontSize: 16,
    maxWidth: 480,
    margin: "0 auto",
    lineHeight: 1.7,
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 24,
  },
  featureCard: {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: "32px",
    backdropFilter: "blur(10px)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    alignSelf: "flex-start",
  },
  featureTag: {
    display: "inline-block",
    border: "1px solid",
    borderRadius: 6,
    padding: "2px 10px",
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    alignSelf: "flex-start",
    fontFamily: "'JetBrains Mono', monospace",
  },
  featureTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
  featureDesc: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.7,
    flex: 1,
  },
  featureBar: {
    height: 3,
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  featureBarFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.5s ease",
  },
  stepsRow: {
    display: "flex",
    alignItems: "stretch",
    gap: 0,
    flexWrap: "wrap",
  },
  stepCard: {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: "32px",
    backdropFilter: "blur(10px)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    margin: 8,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: 800,
    fontFamily: "'JetBrains Mono', monospace",
    border: "1px solid",
    borderRadius: 8,
    padding: "3px 10px",
    alignSelf: "flex-start",
    letterSpacing: "0.05em",
  },
  stepArrow: {
    color: "#334155",
    fontSize: 24,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
  },
  trustLayout: {
    display: "flex",
    gap: 80,
    alignItems: "center",
    flexWrap: "wrap",
  },
  trustLeft: {
    flex: "1 1 320px",
  },
  trustRight: {
    flex: "1 1 380px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  trustItem: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: "16px 20px",
    cursor: "default",
  },
  trustCheck: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "rgba(74,222,128,0.15)",
    color: "#4ade80",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  ctaSection: {
    position: "relative",
    zIndex: 10,
    padding: "100px 24px",
    textAlign: "center",
    overflow: "hidden",
  },
  ctaInner: {
    maxWidth: 640,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  },
  ctaGlow: {
    position: "absolute",
    width: 600,
    height: 600,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    pointerEvents: "none",
  },
  footer: {
    position: "relative",
    zIndex: 10,
    borderTop: "1px solid rgba(255,255,255,0.06)",
    padding: "40px 24px",
  },
  footerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
  },
  footerLogo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  footerLink: {
    background: "none",
    border: "none",
    color: "#475569",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 500,
  },
  footerBadge: {
    color: "#1e293b",
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    textAlign: "center",
  },
};