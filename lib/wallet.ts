// @ts-nocheck

import { hash } from "@/lib/chain";

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
    createdAt: new Date().toLocaleString(),
  };
}
