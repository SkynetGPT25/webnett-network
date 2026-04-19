// @ts-nocheck

import { hash } from "@/lib/chain";
import { generateSigningKeypair } from "@/lib/crypto";

export function id() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function wallet(label = "Wallet") {
  const seed = `${label}_${Date.now()}_${Math.random()}`;

  return {
    id: id(),
    label,
    address: `wbn_${hash(seed).slice(0, 18)}`,
    privateKey: `priv_${hash(seed + "_private").repeat(3).slice(0, 48)}`,
    publicKey: "",
    createdAt: new Date().toLocaleString(),
    cryptoMode: "demo",
  };
}

export async function cryptoWallet(label = "Wallet") {
  const keys = await generateSigningKeypair();
  const addressSeed = `${keys.publicKey}_${Date.now()}`;

  return {
    id: id(),
    label,
    address: `wbn_${hash(addressSeed).slice(0, 18)}`,
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
    createdAt: new Date().toLocaleString(),
    cryptoMode: "ECDSA-P256",
  };
}
