// @ts-nocheck

import { id } from "@/lib/wallet";
import { createTransactionPayload, hashTransactionPayload, signPayload, verifyPayloadSignature } from "@/lib/crypto";

export function createFaucetTransaction(to: string, amount = 500) {
  return {
    id: id(),
    from: "NETWORK",
    to,
    amount,
    fee: 0,
    note: "Instant faucet",
    createdAt: new Date().toLocaleString(),
  };
}

export function createRewardTransaction(to: string, amount: number, note = "Block reward") {
  return {
    id: id(),
    from: "NETWORK",
    to,
    amount,
    fee: 0,
    note,
    createdAt: new Date().toLocaleString(),
  };
}

export function createUserTransfer({ from, to, amount, fee }: any) {
  return {
    id: id(),
    from,
    to,
    amount: Number(amount || 0),
    fee: Number(fee || 0),
    note: "User transfer",
    riskScore: Number(amount || 0) > 250 ? "Medium" : "Low",
    createdAt: new Date().toLocaleString(),
  };
}

export async function signUserTransfer(tx: any, wallet: any) {
  const payload = createTransactionPayload(tx);
  const payloadHash = hashTransactionPayload(payload);

  let signature = "";
  let signatureStatus = "Unsigned";

  try {
    if (wallet?.privateKey && wallet?.publicKey) {
      signature = await signPayload(payload, wallet.privateKey);
      signatureStatus = "Signed";
    }
  } catch {
    signatureStatus = "Signature failed";
  }

  return {
    ...tx,
    payload,
    payloadHash,
    signature,
    publicKey: wallet?.publicKey || "",
    signatureStatus,
  };
}

export async function verifyUserTransfer(tx: any) {
  if (tx.note !== "User transfer") return { ok: true, error: null };

  if (!tx.payload || !tx.signature || !tx.publicKey) {
    return {
      ok: false,
      error: "missing a valid signature package",
    };
  }

  const ok = await verifyPayloadSignature(tx.payload, tx.signature, tx.publicKey);

  if (!ok) {
    return {
      ok: false,
      error: "failed signature verification",
    };
  }

  return { ok: true, error: null };
}
