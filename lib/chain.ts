// @ts-nocheck

export const SYMBOL = "WBN";
export const BLOCK_REWARD = 25;
export const MAX_SUPPLY = 100_000_000;

export function hash(input: any) {
  let h = 2166136261;
  const s = JSON.stringify(input);

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }

  return `${(h >>> 0).toString(16).padStart(8, "0")}${Math.abs(h).toString(36)}`;
}

export function fmt(n: any) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function short(a = "") {
  return a.length > 16 ? `${a.slice(0, 10)}...${a.slice(-6)}` : a;
}

export function genesisBlock() {
  const block = {
    index: 0,
    timestamp: new Date().toLocaleString(),
    previousHash: "0",
    nonce: 0,
    transactions: [
      {
        id: "genesis",
        from: "NETWORK",
        to: "GENESIS_RESERVE",
        amount: 1_000_000,
        fee: 0,
        note: "Genesis reserve",
      },
    ],
  };

  return { ...block, hash: hash(block) };
}

export function balances(chain: any[], pending: any[] = []) {
  const b: any = {};

  for (const block of chain) {
    for (const tx of block.transactions || []) {
      if (tx.from !== "NETWORK") {
        b[tx.from] = (b[tx.from] || 0) - tx.amount - (tx.fee || 0);
      }

      b[tx.to] = (b[tx.to] || 0) + tx.amount;
    }
  }

  for (const tx of pending) {
    if (tx.from !== "NETWORK") {
      b[tx.from] = (b[tx.from] || 0) - tx.amount - (tx.fee || 0);
    }
  }

  return b;
}

export function validateChainIntegrity(chain: any[] = []) {
  if (!Array.isArray(chain) || chain.length === 0) {
    return {
      ok: false,
      error: "Chain validation failed: chain is empty.",
      failedAt: null,
    };
  }

  if (chain[0].previousHash !== "0") {
    return {
      ok: false,
      error: "Chain validation failed: genesis block previousHash must be 0.",
      failedAt: 0,
    };
  }

  for (let i = 0; i < chain.length; i += 1) {
    const block = chain[i];
    const { hash: storedHash, ...blockWithoutHash } = block;
    const recalculatedHash = hash(blockWithoutHash);

    if (storedHash !== recalculatedHash) {
      return {
        ok: false,
        error: `Chain validation failed: block #${i} hash does not match its contents.`,
        failedAt: i,
      };
    }

    if (i > 0 && block.previousHash !== chain[i - 1].hash) {
      return {
        ok: false,
        error: `Chain validation failed: block #${i} does not link to previous block.`,
        failedAt: i,
      };
    }
  }

  return {
    ok: true,
    error: null,
    failedAt: null,
  };
}
