// @ts-nocheck

import { hash } from "@/lib/chain";

export function createBlock({ index, previousHash, transactions, nonce = 0 }: any) {
  const block = {
    index,
    timestamp: new Date().toLocaleString(),
    previousHash,
    nonce,
    transactions,
  };

  return {
    ...block,
    hash: hash(block),
  };
}

export function createMinedBlock({ index, previousHash, transactions, difficulty = 1, maxNonce = 50000 }: any) {
  let nonce = 0;
  let block: any = null;
  let blockHash = "";
  const prefix = "0".repeat(Number(difficulty || 1));

  do {
    block = {
      index,
      timestamp: new Date().toLocaleString(),
      previousHash,
      nonce,
      transactions,
    };

    blockHash = hash(block);
    nonce += 1;
  } while (!blockHash.startsWith(prefix) && nonce < maxNonce);

  return {
    ...block,
    hash: blockHash,
  };
}
