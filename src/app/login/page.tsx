"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Shield, Mail, Loader2, CheckCircle, User, Phone, CreditCard, Lock } from "lucide-react";

type Tab = "login" | "register";

export default function LoginPage() {
  const { user, loading, signInWithGoogle, sendOTP, error } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regVoterId, setRegVoterId] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regSent, setRegSent] = useState(false);
  const [regError, setRegError] = useState("");

  useEffect(() => {
    if (!loading && user) router.push("/vote");
  }, [user, loading, router]);

  async function handleGoogle() {
    setGoogleLoading(true);
    await signInWithGoogle();
    setGoogleLoading(false);
  }

  async function handleLoginOTP(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await sendOTP(loginEmail);
      setOtpSent(true);
    } catch { /* error from context */ }
    finally { setSending(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError("");
    if (!regName || !regEmail || !regPhone || !regVoterId) {
      setRegError("All fields are required.");
      return;
    }
    if (!/^\d{10}$/.test(regPhone)) {
      setRegError("Enter a valid 10-digit phone number.");
      return;
    }
    setRegLoading(true);
    try {
      await setDoc(doc(db, "registrations", regEmail), {
        name: regName,
        email: regEmail,
        phone: regPhone,
        voterId: regVoterId,
        registeredAt: new Date().toISOString(),
      });
      await sendOTP(regEmail);
      setRegSent(true);
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setRegLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.fullCenter}>
        <Loader2 style={{ width: 32, height: 32, color: "#60a5fa", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Animated background orbs */}
      <div style={{ ...styles.orb, top: "-15%", left: "-10%", background: "radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)", width: 600, height: 600 }} />
      <div style={{ ...styles.orb, bottom: "-20%", right: "-10%", background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)", width: 700, height: 700 }} />
      <div style={{ ...styles.orb, top: "30%", right: "20%", background: "radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)", width: 400, height: 400 }} />

      {/* Grid lines background */}
      <div style={styles.grid} />

      <div style={styles.container}>
        {/* Left panel — branding */}
        <div style={styles.leftPanel}>
          <div style={styles.brandBadge}>
            <span style={styles.badgeDot} />
            <span style={styles.badgeText}>System Online</span>
          </div>

          <div style={styles.logoWrap}>
            <div style={styles.logoIcon}>
              <Shield style={{ width: 36, height: 36, color: "#fff" }} />
            </div>
          </div>

          <h1 style={styles.brandTitle}>EVoting</h1>
          <p style={styles.brandSub}>Damgård-Jurik<br />Cryptosystem</p>

          <div style={styles.featureList}>
            {[
              { icon: "🔐", text: "Homomorphic Encryption" },
              { icon: "🗳️", text: "Anonymous Voting" },
              { icon: "🔍", text: "Verifiable Audit Trail" },
              { icon: "📊", text: "Live Tally Dashboard" },
            ].map((f) => (
              <div key={f.text} style={styles.featureItem}>
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <span style={styles.featureText}>{f.text}</span>
              </div>
            ))}
          </div>

          <div style={styles.cryptoBadge}>
            <Lock style={{ width: 14, height: 14, color: "#93c5fd" }} />
            <span style={{ color: "#93c5fd", fontSize: 12 }}>End-to-end encrypted · Zero knowledge</span>
          </div>
        </div>

        {/* Right panel — auth form */}
        <div style={styles.rightPanel}>
          <div style={styles.glassCard}>
            {/* Tabs */}
            <div style={styles.tabRow}>
              {(["login", "register"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    ...styles.tabBtn,
                    ...(tab === t ? styles.tabBtnActive : {}),
                  }}
                >
                  {t === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            {/* ── LOGIN ── */}
            {tab === "login" && (
              <div>
                <p style={styles.formTitle}>Welcome back</p>
                <p style={styles.formSub}>Sign in to cast your encrypted vote</p>

                {/* Google */}
                <button onClick={handleGoogle} disabled={googleLoading} style={styles.googleBtn}>
                  {googleLoading ? (
                    <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
                  ) : (
                    <svg style={{ width: 18, height: 18, flexShrink: 0 }} viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  Continue with Google
                </button>

                <div style={styles.divider}>
                  <div style={styles.dividerLine} />
                  <span style={styles.dividerText}>or use email</span>
                  <div style={styles.dividerLine} />
                </div>

                {!otpSent ? (
                  <form onSubmit={handleLoginOTP} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={styles.inputWrap}>
                      <Mail style={styles.inputIcon} />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        style={styles.input}
                      />
                    </div>
                    <button type="submit" disabled={sending} style={styles.primaryBtn}>
                      {sending ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> : null}
                      {sending ? "Sending..." : "Send Magic Link"}
                    </button>
                  </form>
                ) : (
                  <div style={styles.successBox}>
                    <CheckCircle style={{ width: 40, height: 40, color: "#4ade80", margin: "0 auto 12px" }} />
                    <p style={{ color: "#fff", fontWeight: 600, margin: "0 0 6px" }}>Check your inbox!</p>
                    <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 16px" }}>
                      Magic link sent to <span style={{ color: "#60a5fa" }}>{loginEmail}</span>
                    </p>
                    <button onClick={() => setOtpSent(false)} style={styles.linkBtn}>
                      Use a different email
                    </button>
                  </div>
                )}

                {error && <div style={styles.errorBox}>{error}</div>}

                <p style={styles.switchText}>
                  New voter?{" "}
                  <button onClick={() => setTab("register")} style={styles.linkBtn}>
                    Register here
                  </button>
                </p>
              </div>
            )}

            {/* ── REGISTER ── */}
            {tab === "register" && (
              <div>
                <p style={styles.formTitle}>Create account</p>
                <p style={styles.formSub}>Register to participate in elections</p>

                {!regSent ? (
                  <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={styles.inputWrap}>
                      <User style={styles.inputIcon} />
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Full name"
                        required
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.inputWrap}>
                      <Mail style={styles.inputIcon} />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="Email address"
                        required
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.inputWrap}>
                      <Phone style={styles.inputIcon} />
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="10-digit phone number"
                        maxLength={10}
                        required
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.inputWrap}>
                      <CreditCard style={styles.inputIcon} />
                      <input
                        type="text"
                        value={regVoterId}
                        onChange={(e) => setRegVoterId(e.target.value)}
                        placeholder="Student / Voter ID"
                        required
                        style={styles.input}
                      />
                    </div>

                    {regError && <div style={styles.errorBox}>{regError}</div>}

                    <button type="submit" disabled={regLoading} style={styles.primaryBtn}>
                      {regLoading ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> : null}
                      {regLoading ? "Registering..." : "Register & Send Magic Link"}
                    </button>

                    {/* Google register */}
                    <button type="button" onClick={handleGoogle} disabled={googleLoading} style={styles.googleBtn}>
                      {googleLoading ? (
                        <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
                      ) : (
                        <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                      )}
                      Continue with Google
                    </button>
                  </form>
                ) : (
                  <div style={styles.successBox}>
                    <CheckCircle style={{ width: 40, height: 40, color: "#4ade80", margin: "0 auto 12px" }} />
                    <p style={{ color: "#fff", fontWeight: 600, margin: "0 0 6px" }}>Registration successful!</p>
                    <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 16px" }}>
                      Magic link sent to <span style={{ color: "#60a5fa" }}>{regEmail}</span>
                    </p>
                    <p style={{ color: "#64748b", fontSize: 12 }}>Click the link in your email to complete sign-in</p>
                  </div>
                )}

                <p style={styles.switchText}>
                  Already registered?{" "}
                  <button onClick={() => setTab("login")} style={styles.linkBtn}>
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Space Grotesk', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        input::placeholder { color: #475569; }
        input:focus { outline: none; border-color: #3b82f6 !important; background: rgba(30,41,59,0.9) !important; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#020817",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Space Grotesk', sans-serif",
    position: "relative",
    overflow: "hidden",
    padding: "2rem 1rem",
  },
  fullCenter: {
    minHeight: "100vh",
    background: "#020817",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  orb: {
    position: "absolute",
    borderRadius: "50%",
    pointerEvents: "none",
    zIndex: 0,
  },
  grid: {
    position: "absolute",
    inset: 0,
    backgroundImage: `linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)`,
    backgroundSize: "50px 50px",
    zIndex: 0,
  },
  container: {
    display: "flex",
    width: "100%",
    maxWidth: 960,
    minHeight: 580,
    borderRadius: 24,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 25px 80px rgba(0,0,0,0.6)",
    zIndex: 1,
    position: "relative",
  },
  leftPanel: {
    flex: 1,
    background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(23,37,84,0.95) 50%, rgba(30,27,75,0.95) 100%)",
    backdropFilter: "blur(20px)",
    padding: "48px 40px",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid rgba(255,255,255,0.06)",
  },
  brandBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(74,222,128,0.1)",
    border: "1px solid rgba(74,222,128,0.2)",
    borderRadius: 100,
    padding: "6px 14px",
    marginBottom: 36,
    width: "fit-content",
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow: "0 0 8px #4ade80",
    display: "inline-block",
  },
  badgeText: {
    color: "#4ade80",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.05em",
  },
  logoWrap: {
    marginBottom: 20,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 32px rgba(59,130,246,0.4)",
    animation: "float 4s ease-in-out infinite",
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.02em",
    marginBottom: 8,
  },
  brandSub: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 1.6,
    marginBottom: 40,
  },
  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    flex: 1,
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
  },
  featureText: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: 500,
  },
  cryptoBadge: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 32,
  },
  rightPanel: {
    flex: 1,
    background: "rgba(8,15,30,0.95)",
    backdropFilter: "blur(20px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 40px",
  },
  glassCard: {
    width: "100%",
    maxWidth: 380,
  },
  tabRow: {
    display: "flex",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 4,
    marginBottom: 28,
  },
  tabBtn: {
    flex: 1,
    padding: "10px 0",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  tabBtnActive: {
    background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
    color: "#fff",
    boxShadow: "0 4px 15px rgba(59,130,246,0.4)",
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 4,
  },
  formSub: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 24,
  },
  googleBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "#fff",
    color: "#1e293b",
    border: "none",
    borderRadius: 12,
    padding: "13px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 20,
    fontFamily: "'Space Grotesk', sans-serif",
    transition: "all 0.2s",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "rgba(255,255,255,0.08)",
  },
  dividerText: {
    color: "#475569",
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 14,
    width: 16,
    height: 16,
    color: "#475569",
    zIndex: 1,
    pointerEvents: "none",
  } as React.CSSProperties,
  input: {
    width: "100%",
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "13px 14px 13px 42px",
    color: "#fff",
    fontSize: 14,
    fontFamily: "'Space Grotesk', sans-serif",
    transition: "all 0.2s",
  },
  primaryBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "13px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
    boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
    transition: "all 0.2s",
  },
  successBox: {
    textAlign: "center",
    padding: "24px 0",
  },
  errorBox: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 10,
    padding: "10px 14px",
    color: "#f87171",
    fontSize: 13,
    marginTop: 4,
  },
  switchText: {
    textAlign: "center",
    color: "#475569",
    fontSize: 13,
    marginTop: 20,
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#60a5fa",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
    padding: 0,
  },
};
