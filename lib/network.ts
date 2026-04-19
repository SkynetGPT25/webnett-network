// @ts-nocheck

import { genesisBlock } from "@/lib/chain";
import { wallet } from "@/lib/wallet";

export function fresh() {
  const founder = wallet("Founder Wallet");

  return {
    chain: [genesisBlock()],
    wallets: [{ ...founder, address: "GENESIS_RESERVE" }],
    pending: [],
    logs: ["Webnett node booted.", "Genesis block created.", "AI security layer online."],
    validators: [],
    rewardPool: 0,
    proposals: [
      {
        id: "proposal-1",
        title: "Adopt AI-assisted fraud alerts",
        description: "Enable Webnett to warn users before suspicious demo transfers are queued.",
        status: "Open",
        votes: {},
        createdAt: "Genesis Proposal",
      },
    ],
  };
}
