// @ts-nocheck

export function buildNetworkGraph({ wallets = [], validators = [], pending = [], chain = [] }: any = {}) {
  const nodeMap: any = new Map();
  const links: any[] = [];

  function addNode(id: string, data: any = {}) {
    if (!id) return;

    const existing = nodeMap.get(id) || {
      id,
      label: data.label || id,
      type: data.type || "wallet",
      value: 0,
      txCount: 0,
      stake: 0,
      status: data.status || "Active",
    };

    nodeMap.set(id, {
      ...existing,
      ...data,
      value: Math.max(existing.value || 0, data.value || 0),
      txCount: (existing.txCount || 0) + (data.txCount || 0),
      stake: Math.max(existing.stake || 0, data.stake || 0),
    });
  }

  addNode("NETWORK", {
    label: "Webnett Network",
    type: "network",
    status: "Online",
  });

  for (const wallet of wallets) {
    addNode(wallet.address, {
      label: wallet.label || wallet.address,
      type: wallet.address === "GENESIS_RESERVE" ? "reserve" : "wallet",
      address: wallet.address,
    });
  }

  for (const validator of validators) {
    addNode(validator.address, {
      label: validator.label || validator.address,
      type: "validator",
      address: validator.address,
      stake: validator.stake || 0,
      status: validator.status || "Active",
    });
  }

  for (const tx of pending) {
    addNode(tx.from, { txCount: 1 });
    addNode(tx.to, { txCount: 1 });

    links.push({
      id: `pending_${tx.id}`,
      from: tx.from,
      to: tx.to,
      amount: tx.amount || 0,
      fee: tx.fee || 0,
      status: "Pending",
      riskScore: tx.riskScore || "None",
      signatureStatus: tx.signatureStatus || "Not signed",
      txId: tx.id,
    });
  }

  for (const block of chain) {
    addNode(`block_${block.index}`, {
      label: `Block #${block.index}`,
      type: "block",
      blockIndex: block.index,
      hash: block.hash,
    });

    for (const tx of block.transactions || []) {
      addNode(tx.from, { txCount: 1 });
      addNode(tx.to, { txCount: 1 });

      links.push({
        id: `confirmed_${block.index}_${tx.id}`,
        from: tx.from,
        to: tx.to,
        amount: tx.amount || 0,
        fee: tx.fee || 0,
        status: "Confirmed",
        blockIndex: block.index,
        riskScore: tx.riskScore || "None",
        signatureStatus: tx.signatureStatus || "System / confirmed",
        txId: tx.id,
      });
    }
  }

  const nodes = Array.from(nodeMap.values());

  return {
    nodes,
    links,
    stats: {
      nodeCount: nodes.length,
      linkCount: links.length,
      walletCount: nodes.filter((node: any) => node.type === "wallet").length,
      validatorCount: nodes.filter((node: any) => node.type === "validator").length,
      pendingLinks: links.filter((link) => link.status === "Pending").length,
      confirmedLinks: links.filter((link) => link.status === "Confirmed").length,
    },
  };
}
