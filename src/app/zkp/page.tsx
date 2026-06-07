"use client";
import { useState } from "react";
import { deserializePublicKey, verifyZKProof, ZKProof, VerifyResult } from "@/lib/crypto/damgardJurik";
import { getLatestElection, getVoteByReceipt } from "@/lib/firebase/firestore";
import { ShieldCheck, ShieldX, CheckCircle2, XCircle, Loader2, Search } from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "The Problem",
    color: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-900/10",
    content: "In encrypted voting, the server receives a ciphertext like 48293847... — it could encrypt 1 (valid vote) or 999 (attack). The server cannot check without decrypting, which would reveal who you voted for.",
    formula: "C = g^m · r^n mod n²    ← m could be anything!"
  },
  {
    number: "02",
    title: "The Solution — OR Proof",
    color: "text-yellow-400",
    border: "border-yellow-500/30",
    bg: "bg-yellow-900/10",
    content: 'The voter generates two proofs: one for "m = 0" and one for "m = 1". Exactly one is real (computed from the actual vote), the other is mathematically simulated. Both look identical to the verifier.',
    formula: "Proof = { branch_0_proof, branch_1_proof }"
  },
  {
    number: "03",
    title: "Fiat-Shamir Binding",
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-900/10",
    content: "The two branches are tied together with a hash: c0 + c1 = Hash(C, a0, a1). This makes it mathematically impossible to fake both branches simultaneously — you can only simulate one if the other is real.",
    formula: "c0 + c1 = Hash(ciphertext, a0, a1)"
  },
  {
    number: "04",
    title: "Verification",
    color: "text-green-400",
    border: "border-green-500/30",
    bg: "bg-green-900/10",
    content: "The verifier checks three equations without ever decrypting the vote. If all three pass, the vote is guaranteed to be 0 or 1. If it were 999, the equations would fail.",
    formula: "g^r0 · C^c0 = a0\ng^r1 · (C/g)^c1 = a1\nc0 + c1 = Hash(...)"
  }
];

export default function ZKPPage() {
  const [receiptInput, setReceiptInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleVerifyByReceipt() {
    if (!receiptInput.trim()) return;
    setVerifying(true);
    setResult(null);
    setError(null);

    try {
      const vote = await getVoteByReceipt(receiptInput.trim()) as {
        zkProof?: string;
        electionId?: string;
      } | null;

      if (!vote) {
        setError("Receipt token not found. Check the token and try again.");
        setVerifying(false);
        return;
      }

      if (!vote.zkProof) {
        setError("This vote was submitted before ZKP was enabled and has no proof attached.");
        setVerifying(false);
        return;
      }

      const election = await getLatestElection() as { publicKey: Record<string, string> } | null;
      if (!election) {
        setError("Could not load election public key.");
        setVerifying(false);
        return;
      }

      const pk = deserializePublicKey(election.publicKey);
      const proof = JSON.parse(vote.zkProof) as ZKProof;
      const verifyResult = verifyZKProof(proof, pk);
      setResult(verifyResult);
    } catch (e) {
      setError("Verification failed. " + String(e));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-900/40 border border-indigo-500/30 rounded-2xl mb-4">
            <ShieldCheck className="text-indigo-400" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Zero Knowledge Proofs</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Every vote is cryptographically proven to be valid — without revealing who you voted for.
          </p>
        </div>

        {/* One-line summary */}
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-6 mb-10 text-center">
          <p className="text-indigo-200 text-xl font-semibold">
            &quot;Prove your vote is <span className="text-white">0 or 1</span> — without revealing <span className="text-white">which one</span>.&quot;
          </p>
        </div>

        {/* Step by step */}
        <h2 className="text-xl font-bold text-white mb-6">How It Works</h2>
        <div className="space-y-4 mb-12">
          {STEPS.map((step) => (
            <div key={step.number} className={`border ${step.border} ${step.bg} rounded-xl p-6`}>
              <div className="flex items-start gap-4">
                <span className={`font-mono text-2xl font-black ${step.color} shrink-0`}>{step.number}</span>
                <div className="flex-1">
                  <h3 className={`font-bold text-lg mb-2 ${step.color}`}>{step.title}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">{step.content}</p>
                  <div className="bg-gray-950/60 rounded-lg p-3">
                    <pre className={`font-mono text-xs ${step.color} whitespace-pre-wrap`}>{step.formula}</pre>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Why it matters table */}
        <h2 className="text-xl font-bold text-white mb-4">Why It Matters</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left p-4 text-gray-400 font-semibold">Scenario</th>
                <th className="text-center p-4 text-gray-400 font-semibold">Without ZKP</th>
                <th className="text-center p-4 text-gray-400 font-semibold">With ZKP</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Honest vote (m=1)", "✅ Accepted", "✅ Accepted"],
                ["Cheat vote (m=999)", "✅ Accepted 😱", "❌ Rejected"],
                ["Vote privacy", "✅ Kept", "✅ Kept"],
                ["Tally correctness", "⚠️ Not guaranteed", "✅ Guaranteed"],
              ].map(([scenario, without, withZkp], i) => (
                <tr key={i} className="border-b border-gray-800/50 last:border-0">
                  <td className="p-4 text-gray-300">{scenario}</td>
                  <td className="p-4 text-center text-gray-400">{without}</td>
                  <td className="p-4 text-center text-green-400 font-semibold">{withZkp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Live verifier */}
        <h2 className="text-xl font-bold text-white mb-2">Verify a Vote Live</h2>
        <p className="text-gray-400 text-sm mb-6">
          Enter a receipt token from your vote confirmation to verify its ZKP cryptographically.
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={receiptInput}
              onChange={e => setReceiptInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleVerifyByReceipt()}
              placeholder="Enter receipt token..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleVerifyByReceipt}
              disabled={verifying || !receiptInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
            >
              {verifying ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
              {verifying ? "Verifying..." : "Verify"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <XCircle className="text-red-400 shrink-0" size={18} />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className={`rounded-xl border p-6 ${result.valid ? "bg-green-900/20 border-green-500/30" : "bg-red-900/20 border-red-500/30"}`}>
            <div className="flex items-center gap-3 mb-5">
              {result.valid ? (
                <>
                  <CheckCircle2 className="text-green-400" size={24} />
                  <div>
                    <p className="text-green-300 font-bold text-lg">✅ ZKP Valid</p>
                    <p className="text-green-400/70 text-sm">This vote is cryptographically guaranteed to be 0 or 1</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="text-red-400" size={24} />
                  <div>
                    <p className="text-red-300 font-bold text-lg">❌ ZKP Invalid</p>
                    <p className="text-red-400/70 text-sm">This vote may have been tampered with</p>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Verification Checks</p>
              {result.checks.map((check, i) => (
                <div key={i} className="bg-gray-950/50 rounded-lg p-3 flex items-start gap-3">
                  {check.passed
                    ? <CheckCircle2 className="text-green-400 shrink-0 mt-0.5" size={16} />
                    : <XCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                  }
                  <div>
                    <p className="font-mono text-xs text-gray-300 mb-0.5">{check.label}</p>
                    <p className="text-xs text-gray-500">{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}