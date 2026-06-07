"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Shield, Vote, BarChart3, ClipboardList,
  Search, FlaskConical, BookOpen, Settings,
  LogOut, Menu, X, Activity, ChevronDown
} from "lucide-react";

const navItems = [
  { href: "/vote",         label: "Vote",         icon: Vote,          roles: ["voter", "admin"] },
  { href: "/results",      label: "Results",      icon: BarChart3,     roles: ["voter", "admin"] },
  { href: "/dashboard",    label: "Live",         icon: Activity,      roles: ["voter", "admin"] },
  { href: "/bulletin",     label: "Bulletin",     icon: ClipboardList, roles: ["voter", "admin"] },
  { href: "/audit",        label: "Audit",        icon: Search,        roles: ["voter", "admin"] },
  { href: "/playground",   label: "Playground",   icon: FlaskConical,  roles: ["voter", "admin"] },
  { href: "/how-it-works", label: "How It Works", icon: BookOpen,      roles: ["voter", "admin"] },
  { href: "/admin",        label: "Admin",        icon: Settings,      roles: ["admin"] },
];

export default function Navbar() {
  const { user, role, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const visibleItems = navItems.filter(
    (item) => role && item.roles.includes(role)
  );

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (!user) return null;

  return (
    <>
      <nav style={styles.nav}>
        {/* Logo */}
        <Link href="/vote" style={styles.logo}>
          <div style={styles.logoIcon}>
            <Shield style={{ width: 18, height: 18, color: "#fff" }} />
          </div>
          <span style={styles.logoText}>EVoting</span>
          {role === "admin" && (
            <span style={styles.adminBadge}>ADMIN</span>
          )}
        </Link>

        {/* Desktop nav items */}
        <div style={styles.navItems}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...styles.navLink,
                  ...(active ? styles.navLinkActive : {}),
                }}
              >
                <Icon style={{ width: 15, height: 15 }} />
                {item.label}
                {active && <div style={styles.activeDot} />}
              </Link>
            );
          })}
        </div>

        {/* User menu */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={styles.userBtn}
          >
            <div style={styles.avatar}>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
                  {user.email?.[0].toUpperCase()}
                </span>
              )}
            </div>
            <div style={styles.userInfo}>
              <span style={styles.userName}>
                {user.displayName || user.email?.split("@")[0]}
              </span>
              <span style={styles.userEmail}>{user.email}</span>
            </div>
            <ChevronDown style={{ width: 14, height: 14, color: "#64748b" }} />
          </button>

          {userMenuOpen && (
            <div style={styles.userDropdown}>
              <div style={styles.dropdownHeader}>
                <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>
                  {user.displayName || "Voter"}
                </p>
                <p style={{ color: "#64748b", fontSize: 11, margin: 0 }}>{user.email}</p>
                <span style={{
                  ...styles.adminBadge,
                  marginTop: 6,
                  display: "inline-block",
                  background: role === "admin" ? "rgba(251,191,36,0.15)" : "rgba(59,130,246,0.15)",
                  color: role === "admin" ? "#fbbf24" : "#60a5fa",
                  border: `1px solid ${role === "admin" ? "rgba(251,191,36,0.3)" : "rgba(59,130,246,0.3)"}`,
                }}>
                  {role?.toUpperCase()}
                </span>
              </div>
              <div style={styles.dropdownDivider} />
              <button onClick={handleSignOut} style={styles.signOutBtn}>
                <LogOut style={{ width: 14, height: 14 }} />
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={styles.hamburger}
        >
          {mobileOpen
            ? <X style={{ width: 20, height: 20, color: "#fff" }} />
            : <Menu style={{ width: 20, height: 20, color: "#fff" }} />
          }
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={styles.mobileMenu}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  ...styles.mobileLink,
                  ...(active ? styles.mobileLinkActive : {}),
                }}
              >
                <Icon style={{ width: 18, height: 18 }} />
                {item.label}
              </Link>
            );
          })}
          <div style={styles.dropdownDivider} />
          <button onClick={handleSignOut} style={styles.mobileSignOut}>
            <LogOut style={{ width: 16, height: 16 }} />
            Sign out
          </button>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
      `}</style>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    background: "rgba(2,8,23,0.85)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    padding: "0 24px",
    gap: 8,
    zIndex: 1000,
    fontFamily: "'Space Grotesk', sans-serif",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
    marginRight: 16,
    flexShrink: 0,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
  },
  logoText: {
    color: "#fff",
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: "-0.02em",
  },
  adminBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    background: "rgba(251,191,36,0.15)",
    color: "#fbbf24",
    border: "1px solid rgba(251,191,36,0.3)",
    borderRadius: 6,
    padding: "2px 6px",
  },
  navItems: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    flex: 1,
    overflowX: "auto",
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 8,
    color: "#64748b",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: "nowrap",
    transition: "all 0.15s",
    position: "relative",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  navLinkActive: {
    color: "#fff",
    background: "rgba(59,130,246,0.12)",
    border: "1px solid rgba(59,130,246,0.2)",
  },
  activeDot: {
    position: "absolute",
    bottom: -1,
    left: "50%",
    transform: "translateX(-50%)",
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "#3b82f6",
  },
  userBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "6px 12px 6px 6px",
    cursor: "pointer",
    flexShrink: 0,
    fontFamily: "'Space Grotesk', sans-serif",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  userName: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.2,
  },
  userEmail: {
    color: "#475569",
    fontSize: 10,
    lineHeight: 1.2,
  },
  userDropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: 220,
    background: "rgba(8,15,30,0.98)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    backdropFilter: "blur(20px)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    overflow: "hidden",
    zIndex: 1001,
  },
  dropdownHeader: {
    padding: "14px 16px",
  },
  dropdownDivider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    margin: "0",
  },
  signOutBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    background: "none",
    border: "none",
    color: "#f87171",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
    textAlign: "left",
  },
  hamburger: {
    display: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    marginLeft: 8,
  },
  mobileMenu: {
    position: "fixed",
    top: 60,
    left: 0,
    right: 0,
    background: "rgba(2,8,23,0.98)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    zIndex: 999,
    fontFamily: "'Space Grotesk', sans-serif",
  },
  mobileLink: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: 10,
    color: "#64748b",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
  },
  mobileLinkActive: {
    color: "#fff",
    background: "rgba(59,130,246,0.12)",
  },
  mobileSignOut: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    background: "none",
    border: "none",
    color: "#f87171",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
    marginTop: 4,
  },
};