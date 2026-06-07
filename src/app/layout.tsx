import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "EVoting — Damgård-Jurik Cryptosystem",
  description: "Secure e-voting using homomorphic encryption",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        background: "#020817",
        fontFamily: "'Space Grotesk', sans-serif",
        minHeight: "100vh",
      }}>
        <AuthProvider>
          <Navbar />
          <main style={{ paddingTop: 60 }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}