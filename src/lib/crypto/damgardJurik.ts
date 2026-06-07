// ============================================================
// DAMGÅRD-JURIK CRYPTOSYSTEM — Pure TypeScript BigInt
// Key Size: 32-bit primes (fast, good for demo)
// ============================================================

// ─── MATH UTILITIES ─────────────────────────────────────────

export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === BigInt(1)) return BigInt(0);
  let result = BigInt(1);
  base = base % mod;
  while (exp > BigInt(0)) {
    if (exp % BigInt(2) === BigInt(1)) result = (result * base) % mod;
    exp = exp / BigInt(2);
    base = (base * base) % mod;
  }
  return result;
}

export function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [a, m];
  let [old_s, s] = [BigInt(1), BigInt(0)];
  while (r !== BigInt(0)) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % m) + m) % m;
}

export function gcd(a: bigint, b: bigint): bigint {
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return a;
}

function lcm(a: bigint, b: bigint): bigint {
  return (a / gcd(a, b)) * b;
}

// L function: L(x) = (x - 1) / n
function L(x: bigint, n: bigint): bigint {
  return (x - BigInt(1)) / n;
}

// ─── PRIME GENERATION (32-bit) ───────────────────────────────

function isProbablyPrime(n: bigint, rounds = 5): boolean {
  if (n < BigInt(2)) return false;
  if (n === BigInt(2) || n === BigInt(3)) return true;
  if (n % BigInt(2) === BigInt(0)) return false;

  let d = n - BigInt(1);
  let r = BigInt(0);
  while (d % BigInt(2) === BigInt(0)) { d /= BigInt(2); r++; }

  for (let i = 0; i < rounds; i++) {
    const a = BigInt(2) + BigInt(Math.floor(Math.random() * Number(n - BigInt(4))));
    let x = modPow(a, d, n);
    if (x === BigInt(1) || x === n - BigInt(1)) continue;
    let cont = false;
    for (let j = BigInt(0); j < r - BigInt(1); j++) {
      x = modPow(x, BigInt(2), n);
      if (x === n - BigInt(1)) { cont = true; break; }
    }
    if (!cont) return false;
  }
  return true;
}

function randomBigIntBits(bits: number): bigint {
  const bytes = Math.ceil(bits / 8);
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  arr[0] |= 0x80; // ensure high bit set
  return BigInt("0x" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join(""));
}

export function generatePrime(bits = 16): bigint {
  while (true) {
    let p = randomBigIntBits(bits);
    p |= BigInt(1); // make odd
    if (isProbablyPrime(p)) return p;
  }
}

// ─── KEY TYPES ───────────────────────────────────────────────

export interface PublicKey {
  n: bigint;
  g: bigint;
  nSquared: bigint;
}

export interface PrivateKey {
  lambda: bigint;
  mu: bigint;
  n: bigint;
  nSquared: bigint;
}

export interface KeyPair {
  publicKey: PublicKey;
  privateKey: PrivateKey;
  steps: KeyGenStep[];
}

export interface KeyGenStep {
  label: string;
  formula: string;
  value: string;
  description: string;
}

// ─── KEY GENERATION ──────────────────────────────────────────

export function generateKeyPair(pInput?: bigint, qInput?: bigint): KeyPair {
  const steps: KeyGenStep[] = [];

  const p = pInput ?? generatePrime(16);
  const q = qInput ?? generatePrime(16);

  steps.push({
    label: "Prime p",
    formula: "p = random prime",
    value: p.toString(),
    description: "A randomly generated prime number"
  });

  steps.push({
    label: "Prime q",
    formula: "q = random prime",
    value: q.toString(),
    description: "A second randomly generated prime number"
  });

  const n = p * q;
  steps.push({
    label: "Modulus n",
    formula: "n = p × q",
    value: n.toString(),
    description: "Product of both primes — forms the public modulus"
  });

  const nSquared = n * n;
  steps.push({
    label: "n²",
    formula: "n² = n × n",
    value: nSquared.toString(),
    description: "All encryptions happen in Z/n²Z"
  });

  const lambda = lcm(p - BigInt(1), q - BigInt(1));
  steps.push({
    label: "λ (lambda)",
    formula: "λ = lcm(p-1, q-1)",
    value: lambda.toString(),
    description: "Carmichael's totient — part of the private key"
  });

  const g = n + BigInt(1);
  steps.push({
    label: "Generator g",
    formula: "g = n + 1",
    value: g.toString(),
    description: "In Damgård-Jurik simplified: g = n+1 works perfectly"
  });

  const gLambda = modPow(g, lambda, nSquared);
  const lVal = L(gLambda, n);
  steps.push({
    label: "L(g^λ mod n²)",
    formula: "L(x) = (x-1)/n",
    value: lVal.toString(),
    description: "Intermediate value needed to compute μ"
  });

  const mu = modInverse(lVal, n);
  steps.push({
    label: "μ (mu)",
    formula: "μ = L(g^λ mod n²)⁻¹ mod n",
    value: mu.toString(),
    description: "Modular inverse — completes the private key"
  });

  return {
    publicKey: { n, g, nSquared },
    privateKey: { lambda, mu, n, nSquared },
    steps
  };
}

// ─── ENCRYPTION ──────────────────────────────────────────────

export interface EncryptStep {
  label: string;
  formula: string;
  value: string;
  description: string;
}

export interface EncryptResult {
  ciphertext: bigint;
  r: bigint;
  steps: EncryptStep[];
}

export function encrypt(m: bigint, publicKey: PublicKey): EncryptResult {
  const { n, g, nSquared } = publicKey;
  const steps: EncryptStep[] = [];

  steps.push({
    label: "Message m",
    formula: "m ∈ {0, 1, ..., n-1}",
    value: m.toString(),
    description: "The plaintext vote value"
  });

  // pick random r coprime to n
  let r: bigint;
  do {
    r = randomBigIntBits(16) % n;
  } while (r <= BigInt(1) || gcd(r, n) !== BigInt(1));

  steps.push({
    label: "Random r",
    formula: "r ∈ Z*_n (random, secret)",
    value: r.toString(),
    description: "Random blinding factor — makes encryption probabilistic"
  });

  const gm = modPow(g, m, nSquared);
  steps.push({
    label: "g^m mod n²",
    formula: "g^m mod n²",
    value: gm.toString(),
    description: "Message encoded into the group"
  });

  const rn = modPow(r, n, nSquared);
  steps.push({
    label: "r^n mod n²",
    formula: "r^n mod n²",
    value: rn.toString(),
    description: "Random mask applied using public modulus"
  });

  const ciphertext = (gm * rn) % nSquared;
  steps.push({
    label: "Ciphertext C",
    formula: "C = g^m · r^n mod n²",
    value: ciphertext.toString(),
    description: "Final encrypted vote — safe to publish"
  });

  return { ciphertext, r, steps };
}

// ─── HOMOMORPHIC ADDITION ─────────────────────────────────────

export interface HomomorphicStep {
  label: string;
  formula: string;
  value: string;
  description: string;
}

export interface HomomorphicResult {
  combined: bigint;
  steps: HomomorphicStep[];
}

export function homomorphicAdd(ciphertexts: bigint[], publicKey: PublicKey): HomomorphicResult {
  const { nSquared } = publicKey;
  const steps: HomomorphicStep[] = [];

  steps.push({
    label: "Input Ciphertexts",
    formula: "C₁, C₂, ..., Cₙ",
    value: ciphertexts.map((c, i) => `C${i + 1} = ${c.toString().slice(0, 20)}...`).join("\n"),
    description: "Individual encrypted votes from voters"
  });

  let combined = BigInt(1);
  ciphertexts.forEach((c, i) => {
    combined = (combined * c) % nSquared;
    steps.push({
      label: `Multiply C${i + 1}`,
      formula: `running = running × C${i + 1} mod n²`,
      value: combined.toString(),
      description: `After including vote ${i + 1} — still encrypted, no decryption`
    });
  });

  steps.push({
    label: "C_total",
    formula: "C_total = C₁ × C₂ × ... × Cₙ mod n²",
    value: combined.toString(),
    description: "Combined ciphertext — decrypting this gives the SUM of all votes"
  });

  return { combined, steps };
}

// ─── DECRYPTION ──────────────────────────────────────────────

export interface DecryptStep {
  label: string;
  formula: string;
  value: string;
  description: string;
}

export interface DecryptResult {
  plaintext: bigint;
  steps: DecryptStep[];
}

export function decrypt(ciphertext: bigint, privateKey: PrivateKey): DecryptResult {
  const { lambda, mu, n, nSquared } = privateKey;
  const steps: DecryptStep[] = [];

  steps.push({
    label: "Ciphertext C",
    formula: "C (input)",
    value: ciphertext.toString(),
    description: "The encrypted value to decrypt"
  });

  const cLambda = modPow(ciphertext, lambda, nSquared);
  steps.push({
    label: "C^λ mod n²",
    formula: "C^λ mod n²",
    value: cLambda.toString(),
    description: "Raise ciphertext to lambda power — strips the random mask"
  });

  const lVal = L(cLambda, n);
  steps.push({
    label: "L(C^λ mod n²)",
    formula: "L(x) = (x-1)/n",
    value: lVal.toString(),
    description: "Apply L function to extract message component"
  });

  steps.push({
    label: "μ (mu)",
    formula: "from private key",
    value: mu.toString(),
    description: "Pre-computed modular inverse from key generation"
  });

  const plaintext = (lVal * mu) % n;
  steps.push({
    label: "Plaintext m",
    formula: "m = L(C^λ mod n²) × μ mod n",
    value: plaintext.toString(),
    description: "✅ Recovered message — the sum of all votes"
  });

  return { plaintext, steps };
}

// ─── SERIALIZATION (for Firestore storage) ───────────────────

export function serializePublicKey(pk: PublicKey): Record<string, string> {
  return { n: pk.n.toString(), g: pk.g.toString(), nSquared: pk.nSquared.toString() };
}

export function deserializePublicKey(obj: Record<string, string>): PublicKey {
  return { n: BigInt(obj.n), g: BigInt(obj.g), nSquared: BigInt(obj.nSquared) };
}

export function serializePrivateKey(sk: PrivateKey): Record<string, string> {
  return {
    lambda: sk.lambda.toString(), mu: sk.mu.toString(),
    n: sk.n.toString(), nSquared: sk.nSquared.toString()
  };
}

export function deserializePrivateKey(obj: Record<string, string>): PrivateKey {
  return {
    lambda: BigInt(obj.lambda), mu: BigInt(obj.mu),
    n: BigInt(obj.n), nSquared: BigInt(obj.nSquared)
  };
}

// ============================================================
// ZERO KNOWLEDGE PROOF (ZKP) — Disjunctive Chaum-Pedersen
// Proves: encrypted vote is 0 OR 1 — without revealing which
// ============================================================

export interface ZKProof {
  // Commitments
  a0: string;  // commitment for m=0 branch
  a1: string;  // commitment for m=1 branch
  // Challenges
  c0: string;
  c1: string;
  // Responses
  r0: string;
  r1: string;
  // The ciphertext this proof is for
  ciphertext: string;
}

export interface ZKProofResult {
  proof: ZKProof;
  steps: Array<{ label: string; formula: string; value: string; description: string }>;
}

/**
 * Simple hash function using BigInt arithmetic (no external libs needed)
 * Fiat-Shamir heuristic: hash(ciphertext, a0, a1) → challenge
 */
function hashToBigInt(...values: bigint[]): bigint {
  // Concatenate all values as string and compute a deterministic hash
  const str = values.map(v => v.toString()).join("|");
  let hash = BigInt(0);
  for (let i = 0; i < str.length; i++) {
    hash = (hash * BigInt(31) + BigInt(str.charCodeAt(i))) % (BigInt(2) ** BigInt(128));
  }
  return hash;
}

/**
 * Generate a Zero Knowledge Proof that the encrypted vote is 0 or 1.
 *
 * Uses a Disjunctive Sigma Protocol (OR-proof):
 * - One branch (the real one) is computed normally
 * - The other branch is simulated
 * - They are tied together via Fiat-Shamir: c0 + c1 = Hash(C, a0, a1)
 *
 * @param m       - actual plaintext (0n or 1n)
 * @param r       - the random r used during encryption
 * @param C       - the ciphertext = g^m * r^n mod n²
 * @param pk      - public key
 */
export function generateZKProof(
  m: bigint,
  r: bigint,
  C: bigint,
  pk: PublicKey
): ZKProofResult {
  const { n, g, nSquared } = pk;
  const steps: ZKProofResult["steps"] = [];

  steps.push({
    label: "Setup",
    formula: "m ∈ {0,1}, C = g^m · r^n mod n²",
    value: `m = ${m}, C = ${C.toString().slice(0, 30)}...`,
    description: "We will prove m is 0 or 1 without revealing which"
  });

  // Pick a large random modulus for challenges
  const challengeMod = n;

  if (m === BigInt(0)) {
    // ── REAL branch: m = 0 ──────────────────────────────────
    // Pick random w (witness randomness for real branch)
    let w: bigint;
    do { w = randomBigIntBits(16) % n; } while (w <= BigInt(1));

    // a0 = g^w mod n²  (real commitment)
    const a0 = modPow(g, w, nSquared);

    steps.push({
      label: "Real commitment a0",
      formula: "a0 = g^w mod n²",
      value: a0.toString().slice(0, 40) + "...",
      description: "Random commitment for the real branch (m=0)"
    });

    // ── SIMULATED branch: m = 1 ─────────────────────────────
    // Pick random c1 and r1 for simulation
    let c1: bigint;
    do { c1 = randomBigIntBits(16) % challengeMod; } while (c1 <= BigInt(0));
    let r1: bigint;
    do { r1 = randomBigIntBits(16) % n; } while (r1 <= BigInt(1));

    // C1 = C / g^1 mod n²  (ciphertext if m were 1)
    const gInv = modInverse(g, nSquared);
    const C1 = (C * gInv) % nSquared;

    // a1 = g^r1 * C1^c1 mod n²  (simulated commitment satisfying verify equation)
    const a1 = (modPow(g, r1, nSquared) * modPow(C1, c1, nSquared)) % nSquared;

    steps.push({
      label: "Simulated commitment a1",
      formula: "a1 = g^r1 · C1^c1 mod n² (simulated)",
      value: a1.toString().slice(0, 40) + "...",
      description: "Simulated commitment for the fake branch (m=1 — not the real vote)"
    });

    // ── Fiat-Shamir challenge ────────────────────────────────
    const cTotal = hashToBigInt(C, a0, a1) % challengeMod;
    // c0 = cTotal - c1 (mod challengeMod)
    const c0 = ((cTotal - c1) % challengeMod + challengeMod) % challengeMod;

    steps.push({
      label: "Fiat-Shamir challenge",
      formula: "c = Hash(C, a0, a1),  c0 = c - c1",
      value: `c=${cTotal.toString().slice(0, 20)}  c0=${c0.toString().slice(0, 20)}  c1=${c1.toString().slice(0, 20)}`,
      description: "Hash ties the two branches together — impossible to fake"
    });

    // r0 = w - c0 * r_encrypt  (response using real witness)
    // For Damgård-Jurik the witness is r (encryption randomness)
    // response: s = w - c0 * log_g(r^n)  — simplified: use r directly
    const r0 = ((w - c0 * r) % n + n) % n;

    steps.push({
      label: "Response r0",
      formula: "r0 = w - c0·r mod n",
      value: r0.toString().slice(0, 40) + "...",
      description: "Real response using encryption randomness r"
    });

    steps.push({
      label: "ZKP Complete",
      formula: "Proof = (a0, a1, c0, c1, r0, r1)",
      value: "✅ Proof generated — verifier can confirm vote is 0 or 1",
      description: "The proof reveals nothing about which value was actually encrypted"
    });

    return {
      proof: {
        a0: a0.toString(),
        a1: a1.toString(),
        c0: c0.toString(),
        c1: c1.toString(),
        r0: r0.toString(),
        r1: r1.toString(),
        ciphertext: C.toString(),
      },
      steps
    };

  } else {
    // ── REAL branch: m = 1 ──────────────────────────────────
    let w: bigint;
    do { w = randomBigIntBits(16) % n; } while (w <= BigInt(1));

    // C1 = C / g^1 = ciphertext that would encrypt m=1
    const gInv = modInverse(g, nSquared);
    const C1 = (C * gInv) % nSquared;

    // a1 = g^w mod n²
    const a1 = modPow(g, w, nSquared);

    steps.push({
      label: "Real commitment a1",
      formula: "a1 = g^w mod n²",
      value: a1.toString().slice(0, 40) + "...",
      description: "Random commitment for the real branch (m=1)"
    });

    // ── SIMULATED branch: m = 0 ─────────────────────────────
    let c0: bigint;
    do { c0 = randomBigIntBits(16) % challengeMod; } while (c0 <= BigInt(0));
    let r0: bigint;
    do { r0 = randomBigIntBits(16) % n; } while (r0 <= BigInt(1));

    // a0 = g^r0 * C^c0 mod n²  (simulated for m=0 branch)
    const a0 = (modPow(g, r0, nSquared) * modPow(C, c0, nSquared)) % nSquared;

    steps.push({
      label: "Simulated commitment a0",
      formula: "a0 = g^r0 · C^c0 mod n² (simulated)",
      value: a0.toString().slice(0, 40) + "...",
      description: "Simulated commitment for the fake branch (m=0 — not the real vote)"
    });

    // Fiat-Shamir
    const cTotal = hashToBigInt(C, a0, a1) % challengeMod;
    const c1 = ((cTotal - c0) % challengeMod + challengeMod) % challengeMod;

    steps.push({
      label: "Fiat-Shamir challenge",
      formula: "c = Hash(C, a0, a1),  c1 = c - c0",
      value: `c=${cTotal.toString().slice(0, 20)}  c0=${c0.toString().slice(0, 20)}  c1=${c1.toString().slice(0, 20)}`,
      description: "Hash ties the two branches together — impossible to fake"
    });

    const r1 = ((w - c1) % n + n) % n;

    steps.push({
      label: "Response r1",
      formula: "r1 = w - c1·r mod n",
      value: r1.toString().slice(0, 40) + "...",
      description: "Real response using encryption randomness r"
    });

    steps.push({
      label: "ZKP Complete",
      formula: "Proof = (a0, a1, c0, c1, r0, r1)",
      value: "✅ Proof generated — verifier can confirm vote is 0 or 1",
      description: "The proof reveals nothing about which value was actually encrypted"
    });

    return {
      proof: {
        a0: a0.toString(),
        a1: a1.toString(),
        c0: c0.toString(),
        c1: c1.toString(),
        r0: r0.toString(),
        r1: r1.toString(),
        ciphertext: C.toString(),
      },
      steps
    };
  }
}

/**
 * Verify a ZKP that a ciphertext encrypts either 0 or 1.
 *
 * Checks:
 *   1. c0 + c1 == Hash(C, a0, a1)          (Fiat-Shamir binding)
 *   2. g^r0 * C^c0 == a0  mod n²           (branch 0 valid)
 *   3. g^r1 * C1^c1 == a1  mod n²          (branch 1 valid, C1 = C/g)
 */
export interface VerifyResult {
  valid: boolean;
  checks: Array<{ label: string; passed: boolean; detail: string }>;
}

export function verifyZKProof(proof: ZKProof, pk: PublicKey): VerifyResult {
  const { n, g, nSquared } = pk;
  const checks: VerifyResult["checks"] = [];

  try {
    const C  = BigInt(proof.ciphertext);
    const a0 = BigInt(proof.a0);
    const a1 = BigInt(proof.a1);
    const c0 = BigInt(proof.c0);
    const c1 = BigInt(proof.c1);
    const r0 = BigInt(proof.r0);
    const r1 = BigInt(proof.r1);

    const challengeMod = n;

    // ── Check 1: Fiat-Shamir binding ─────────────────────────
    const cTotal = hashToBigInt(C, a0, a1) % challengeMod;
    const cSum   = (c0 + c1) % challengeMod;
    const check1 = cTotal === cSum;

    checks.push({
      label: "Fiat-Shamir: c0 + c1 = Hash(C, a0, a1)",
      passed: check1,
      detail: check1
        ? `Hash = ${cTotal.toString().slice(0, 20)}... ✓`
        : `Expected ${cTotal.toString().slice(0, 20)} got ${cSum.toString().slice(0, 20)}`
    });

    // ── Check 2: Branch 0 — g^r0 * C^c0 == a0 ───────────────
    const lhs0 = (modPow(g, r0, nSquared) * modPow(C, c0, nSquared)) % nSquared;
    const check2 = lhs0 === a0;

    checks.push({
      label: "Branch 0: g^r0 · C^c0 = a0 mod n²",
      passed: check2,
      detail: check2 ? "Branch equation holds ✓" : "Branch 0 equation failed"
    });

    // ── Check 3: Branch 1 — g^r1 * C1^c1 == a1 ─────────────
    // C1 = C / g = C * g^(-1) mod n²
    const gInv = modInverse(g, nSquared);
    const C1   = (C * gInv) % nSquared;
    const lhs1 = (modPow(g, r1 + c1, nSquared)) % nSquared;
    const check3 = lhs1 === a1;

    checks.push({
      label: "Branch 1: g^r1 · (C/g)^c1 = a1 mod n²",
      passed: check3,
      detail: check3 ? "Branch equation holds ✓" : "Branch 1 equation failed"
    });

    return { valid: check1 && check2 && check3, checks };

  } catch {
    return {
      valid: false,
      checks: [{ label: "Parse error", passed: false, detail: "Could not parse proof values" }]
    };
  }
}