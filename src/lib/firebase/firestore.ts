import {
  collection, addDoc, getDocs, doc,
  getDoc, setDoc, query, where,
  orderBy, serverTimestamp, updateDoc, onSnapshot, limit
} from "firebase/firestore";
import { db } from "./config";

export async function createElection(data: {
  title: string;
  description: string;
  candidates: { id: string; name: string; party: string }[];
  deadline: string;
  publicKey: Record<string, string>;
  createdBy: string;
}) {
  return await addDoc(collection(db, "elections"), {
    ...data,
    status: "open",
    createdAt: serverTimestamp(),
  });
}

export async function getActiveElection() {
  const q = query(collection(db, "elections"), where("status", "==", "open"));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

// Returns active election first, then most recent closed one
export async function getLatestElection() {
  // Retry up to 8 times with 1s delay to handle Firestore propagation delay
  for (let attempt = 0; attempt < 8; attempt++) {
    const q1 = query(collection(db, "elections"), where("status", "==", "open"));
    const s1 = await getDocs(q1);
    if (!s1.empty) return { id: s1.docs[0].id, ...s1.docs[0].data() };

    const q2 = query(collection(db, "elections"), where("status", "==", "closed"));
    const s2 = await getDocs(q2);
    if (!s2.empty) {
      const sorted = s2.docs.sort((a, b) => {
        const aTime = (a.data().closedAt?.seconds ?? 0);
        const bTime = (b.data().closedAt?.seconds ?? 0);
        return bTime - aTime;
      });
      return { id: sorted[0].id, ...sorted[0].data() };
    }

    // Nothing found yet — wait and retry
    await new Promise(r => setTimeout(r, 1000));
  }

  return null;
}

export async function getElection(id: string) {
  const snap = await getDoc(doc(db, "elections", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function closeElection(id: string, results: Record<string, number>) {
  await updateDoc(doc(db, "elections", id), {
    status: "closed",
    closedAt: serverTimestamp(),
    results,
  });
}

export async function submitVote(data: {
  electionId: string;
  voterId: string;
  candidateId: string;
  ciphertext: string;
  allCiphertexts: string;
  receiptToken: string;
  zkProof?: string;
}) {
  return await addDoc(collection(db, "votes"), {
    ...data,
    timestamp: serverTimestamp(),
  });
}

export async function hasVoted(electionId: string, voterId: string): Promise<boolean> {
  const q = query(
    collection(db, "votes"),
    where("electionId", "==", electionId),
    where("voterId", "==", voterId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function getVotesForElection(electionId: string) {
  const q = query(
    collection(db, "votes"),
    where("electionId", "==", electionId),
    orderBy("timestamp", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getVoteByReceipt(receiptToken: string) {
  const q = query(collection(db, "votes"), where("receiptToken", "==", receiptToken));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function setAdminEmail(email: string) {
  await setDoc(doc(db, "config", "admin"), { email });
}

export async function getAdminEmail(): Promise<string | null> {
  const snap = await getDoc(doc(db, "config", "admin"));
  if (!snap.exists()) return null;
  return (snap.data() as { email: string }).email;
}

export function subscribeToVotes(
  electionId: string,
  callback: (votes: Record<string, unknown>[]) => void
) {
  const q = query(
    collection(db, "votes"),
    where("electionId", "==", electionId)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}