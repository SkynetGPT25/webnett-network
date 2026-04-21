// @ts-nocheck

export function buildCurrencyAnalytics({ chain = [], pending = [], balances = {}, validators = [], rewardPool = 0 }: any = {}) {
  const confirmedTransactions = chain.flatMap((block: any) =>
    (block.transactions || []).map((tx: any) => ({
      ...tx,
      blockIndex: block.index,
      blockHash: block.hash,
    }))
  );

  const userTransfers = confirmedTransactions.filter((tx: any) => tx.note === "User transfer");
  const faucetTransactions = confirmedTransactions.filter((tx: any) => tx.note?.includes("faucet") || tx.note === "Instant faucet");
  const rewardTransactions = confirmedTransactions.filter((tx: any) => tx.note?.includes("reward"));

  const walletBalances = Object.entries(balances)
    .filter(([address]) => address !== "GENESIS_RESERVE")
    .map(([address, balance]: any) => ({ address, balance: Number(balance || 0) }))
    .sort((a: any, b: any) => b.balance - a.balance);

  const totalWalletBalance = walletBalances.reduce((sum: number, item: any) => sum + item.balance, 0);
  const pendingVolume = pending.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
  const pendingFees = pending.reduce((sum: number, tx: any) => sum + Number(tx.fee || 0), 0);
  const confirmedUserVolume = userTransfers.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
  const confirmedFees = confirmedTransactions.reduce((sum: number, tx: any) => sum + Number(tx.fee || 0), 0);
  const totalStaked = validators.reduce((sum: number, validator: any) => sum + Number(validator.stake || 0), 0);

  const blockSeries = chain.map((block: any) => {
    const txs = block.transactions || [];
    return {
      blockIndex: block.index,
      transactions: txs.length,
      volume: txs.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0),
      fees: txs.reduce((sum: number, tx: any) => sum + Number(tx.fee || 0), 0),
    };
  });

  return {
    walletBalances,
    blockSeries,
    stats: {
      totalWalletBalance,
      pendingVolume,
      pendingFees,
      confirmedUserVolume,
      confirmedFees,
      totalStaked,
      rewardPool,
      userTransferCount: userTransfers.length,
      faucetCount: faucetTransactions.length,
      rewardCount: rewardTransactions.length,
      blockCount: chain.length,
      pendingCount: pending.length,
    },
  };
}
