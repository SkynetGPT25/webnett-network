"use client";
// @ts-nocheck

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Blocks,
  CheckCircle2,
  Coins,
  Copy,
  Cpu,
  Database,
  Lock,
  Pickaxe,
  ReceiptText,
  Rocket,
  SearchCheck,
  Send,
  Shield,
  Sparkles,
  Target,
  Terminal,
  Vote,
  Wallet,
  Users,
} from "lucide-react";

const MAX_SUPPLY = 100_000_000;
const BLOCK_REWARD = 25;
const SYMBOL = "WBN";
const STORAGE_KEY = "webnett-prototype-node";

function safeRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function tinyHash(input) {
  let hash = 2166136261;
  const str = JSON.stringify(input);

  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return `${(hash >>> 0).toString(16).padStart(8, "0")}${Math.abs(hash)
    .toString(36)
    .padStart(8, "0")}`;
}

function makeAddress(seed = Math.random().toString()) {
  return `wbn_${tinyHash(`${seed}_${Date.now()}`).slice(0, 18)}`;
}

function makeWallet(label = "Wallet") {
  const privateKey = `priv_${tinyHash(`${Math.random()}_${Date.now()}`)
    .repeat(3)
    .slice(0, 48)}`;
  const address = makeAddress(privateKey);

  return {
    id: safeRandomId(),
    label,
    address,
    privateKey,
    createdAt: new Date().toLocaleString(),
  };
}

function createGenesisBlock() {
  const block = {
    index: 0,
    timestamp: new Date().toLocaleString(),
    transactions: [
      {
        id: "genesis",
        from: "NETWORK",
        to: "GENESIS_RESERVE",
        amount: 1_000_000,
        fee: 0,
        note: "Genesis reserve created for Webnett prototype",
      },
    ],
    previousHash: "0",
    nonce: 0,
  };

  return { ...block, hash: tinyHash(block) };
}

function calculateBalances(chain, pending = []) {
  const balances = {};

  for (const block of chain) {
    for (const tx of block.transactions || []) {
      if (tx.from !== "NETWORK" && tx.from !== "GENESIS") {
        balances[tx.from] = (balances[tx.from] || 0) - tx.amount - (tx.fee || 0);
      }

      balances[tx.to] = (balances[tx.to] || 0) + tx.amount;
    }
  }

  for (const tx of pending) {
    if (tx.from !== "NETWORK") {
      balances[tx.from] = (balances[tx.from] || 0) - tx.amount - (tx.fee || 0);
    }
  }

  return balances;
}

function format(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function shortAddress(address = "") {
  if (!address || address.length < 16) return address;
  return `${address.slice(0, 10)}...${address.slice(-6)}`;
}

function buildFreshNetwork() {
  const founder = makeWallet("Founder Wallet");

  return {
    chain: [createGenesisBlock()],
    wallets: [{ ...founder, address: "GENESIS_RESERVE" }],
    pending: [],
    logs: [
      "Webnett prototype node booted.",
      "Genesis block created.",
      "AI security layer standing by for transaction risk checks.",
    ],
  };
}

function runSelfTests() {
  const genesis = createGenesisBlock();
  const testWallet = { address: "wbn_test_wallet" };
  const faucetBlock = {
    index: 1,
    timestamp: "test",
    transactions: [
      {
        id: "test-faucet",
        from: "NETWORK",
        to: testWallet.address,
        amount: 500,
        fee: 0,
        note: "Test faucet",
      },
    ],
    previousHash: genesis.hash,
    nonce: 0,
  };
  const chain = [genesis, { ...faucetBlock, hash: tinyHash(faucetBlock) }];
  const balances = calculateBalances(chain, []);

  console.assert(typeof tinyHash("abc") === "string", "tinyHash should return a string");
  console.assert(genesis.previousHash === "0", "genesis block should start the chain");
  console.assert(balances[testWallet.address] === 500, "faucet balance should equal 500 WBN");
  console.assert(chain[1].previousHash === chain[0].hash, "test chain should link block 1 to genesis");
}

if (typeof window !== "undefined") {
  runSelfTests();
}

export default function Home() {
  const freshNetwork = useMemo(() => buildFreshNetwork(), []);
  const [chain, setChain] = useState(freshNetwork.chain);
  const [wallets, setWallets] = useState(freshNetwork.wallets);
  const [selectedWalletId, setSelectedWalletId] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState([]);
  const [logs, setLogs] = useState(freshNetwork.logs);
  const [walletName, setWalletName] = useState("");
  const [difficulty, setDifficulty] = useState(2);
  const [activeTab, setActiveTab] = useState("wallet");
  const [exportData, setExportData] = useState("");
  const [importData, setImportData] = useState("");
  const [autoSave, setAutoSave] = useState(true);
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);
  const [validators, setValidators] = useState([]);
  const [stakeAmount, setStakeAmount] = useState("100");
  const [rewardPool, setRewardPool] = useState(0);
  const [proposalTitle, setProposalTitle] = useState("Increase faucet reward to 750 WBN");
  const [proposalDescription, setProposalDescription] = useState(
    "A demo governance proposal to test validator voting power and decision tracking."
  );
  const [proposals, setProposals] = useState([
    {
      id: "proposal-genesis-1",
      title: "Adopt AI-assisted fraud alerts",
      description:
        "Enable Webnett's AI layer to flag suspicious demo transfers before they are queued.",
      status: "Open",
      createdAt: "Genesis Proposal",
      votes: {},
    },
  ]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (parsed?.chain?.length && parsed?.wallets?.length) {
        setChain(parsed.chain);
        setWallets(parsed.wallets);
        setPending(parsed.pending || []);
        setLogs(parsed.logs || freshNetwork.logs);
        setSelectedWalletId(parsed.selectedWalletId || parsed.wallets[0]?.id || null);
        setValidators(parsed.validators || []);
        setRewardPool(parsed.rewardPool || 0);
        setProposals(parsed.proposals || proposals);
      }
    } catch {
      setLogs((prev) => ["Saved node data could not be loaded. Starting fresh.", ...prev]);
    }
  }, [freshNetwork.logs]);

  useEffect(() => {
    if (!autoSave) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          chain,
          wallets,
          pending,
          logs,
          selectedWalletId,
          validators,
          proposals,
          rewardPool,
        })
      );
    } catch {}
  }, [chain, wallets, pending, logs, selectedWalletId, validators, proposals, rewardPool, autoSave]);

  const balances = useMemo(() => calculateBalances(chain, pending), [chain, pending]);
  const selectedWallet = wallets.find((w) => w.id === selectedWalletId) || wallets[0];

  const confirmedTransactions = useMemo(
    () =>
      chain
        .flatMap((block) =>
          (block.transactions || []).map((tx) => ({
            ...tx,
            blockIndex: block.index,
            blockHash: block.hash,
          }))
        )
        .reverse(),
    [chain]
  );

  const userWallets = wallets.filter((w) => w.address !== "GENESIS_RESERVE");
  const hasUserWallet = userWallets.length > 0;
  const rawSelectedBalance = balances[selectedWallet?.address] || 0;
  const totalFeesPending = pending.reduce((sum, tx) => sum + (tx.fee || 0), 0);
  const userTransfers = confirmedTransactions.filter((tx) => tx.note === "User transfer");
  const lastBlock = chain[chain.length - 1];
  const chainLooksLinked = chain.every(
    (block, index) => index === 0 || block.previousHash === chain[index - 1].hash
  );

  const knownAddresses = new Set(wallets.map((w) => w.address));
  const pendingRisk = pending.some((tx) => !knownAddresses.has(tx.to))
    ? "Unknown recipient"
    : pending.some((tx) => tx.amount > 250)
      ? "Medium"
      : pending.length
        ? "Low"
        : "None";

  const selectedReceipt =
    confirmedTransactions.find((tx) => `${tx.blockHash}-${tx.id}` === selectedReceiptId) ||
    userTransfers[0] ||
    confirmedTransactions[0];

  const totalStaked = validators.reduce((sum, validator) => sum + validator.stake, 0);
  const selectedValidator = validators.find(
    (validator) => validator.address === selectedWallet?.address
  );
  const selectedStake = selectedValidator?.stake || 0;
  const selectedBalance = Math.max(0, rawSelectedBalance - selectedStake);
  const selectedVotingPower =
    totalStaked > 0 && selectedValidator ? (selectedValidator.stake / totalStaked) * 100 : 0;

  const spendableBalances = useMemo(() => {
    const lockedByAddress = validators.reduce((acc, validator) => {
      acc[validator.address] = (acc[validator.address] || 0) + validator.stake;
      return acc;
    }, {});

    return Object.fromEntries(
      Object.entries(balances).map(([address, balance]) => [
        address,
        Math.max(0, balance - (lockedByAddress[address] || 0)),
      ])
    );
  }, [balances, validators]);

  const openProposals = proposals.filter((proposal) => proposal.status === "Open").length;
  const selectedRewardShare =
    totalStaked > 0 && selectedValidator
      ? rewardPool * (selectedValidator.stake / totalStaked)
      : 0;

  const productFeatures = [
    ["Wallets", "Create demo wallets, fund them with test WBN, and track spendable vs. locked balances."],
    ["Transfers", "Queue WBN transfers, confirm them into blocks, and inspect receipts in the explorer."],
    ["Validators", "Stake WBN to secure the network, gain voting power, and claim validator rewards."],
    ["Governance", "Create proposals and vote yes/no with validator-weighted demo stake."],
  ];

  const statCards = [
    { label: "Blocks", value: chain.length, icon: Blocks },
    { label: "Wallets", value: wallets.length, icon: Wallet },
    { label: "Pending TX", value: pending.length, icon: Activity },
    { label: "Confirmed TX", value: confirmedTransactions.length, icon: ReceiptText },
    { label: "Validators", value: validators.length, icon: Users },
    { label: "Open Votes", value: openProposals, icon: Vote },
    { label: "Reward Pool", value: `${format(rewardPool)} ${SYMBOL}`, icon: Coins },
  ];

  const guideSteps = [
    {
      title: "Create wallet",
      done: hasUserWallet,
      text: "Generate your first demo Webnett wallet.",
    },
    {
      title: "Fund wallet",
      done: selectedBalance > 0 || rawSelectedBalance > 0,
      text: "Add instant test WBN so you can move coins.",
    },
    {
      title: "Send coins",
      done: userTransfers.length > 0,
      text: "Create another wallet, send WBN, then mine it.",
    },
    {
      title: "Secure network",
      done: validators.length > 0,
      text: "Stake WBN to become a validator.",
    },
  ];

  const launchReadiness = [
    { label: "Wallets", ready: userWallets.length >= 2, detail: `${userWallets.length} user wallet(s)` },
    { label: "Transfers", ready: userTransfers.length > 0, detail: `${userTransfers.length} user transfer(s)` },
    { label: "Validators", ready: validators.length > 0, detail: `${validators.length} active validator(s)` },
    { label: "Governance", ready: proposals.length > 0, detail: `${proposals.length} proposal(s)` },
    {
      label: "Rewards",
      ready: rewardPool > 0 || confirmedTransactions.some((tx) => tx.note === "Validator reward claim"),
      detail: `${format(rewardPool)} ${SYMBOL} in pool`,
    },
    { label: "Chain Audit", ready: chainLooksLinked, detail: chainLooksLinked ? "Healthy" : "Needs repair" },
  ];

  const launchReadyCount = launchReadiness.filter((item) => item.ready).length;
  const launchScore = Math.round((launchReadyCount / launchReadiness.length) * 100);

  function addLog(message) {
    setLogs((prev) => [message, ...prev].slice(0, 8));
  }

  function createWallet() {
    const next = makeWallet(walletName || `Wallet ${userWallets.length + 1}`);
    setWallets((prev) => [...prev, next]);
    setSelectedWalletId(next.id);
    setWalletName("");
    addLog(`New wallet created: ${next.address}`);
  }

  function requestFaucet(wallet = selectedWallet) {
    const targetWallet = wallet || wallets[0];
    if (!targetWallet) return addLog("Faucet request failed: no wallet exists yet.");
    if (targetWallet.address === "GENESIS_RESERVE") {
      return addLog("Create or select a user wallet before adding test money.");
    }

    const faucetTx = {
      id: safeRandomId(),
      from: "NETWORK",
      to: targetWallet.address,
      amount: 500,
      fee: 0,
      note: "Instant prototype faucet reward",
      createdAt: new Date().toLocaleString(),
    };

    const previousHash = chain[chain.length - 1].hash;
    const block = {
      index: chain.length,
      timestamp: new Date().toLocaleString(),
      transactions: [faucetTx],
      previousHash,
      nonce: 0,
    };
    const confirmedBlock = { ...block, hash: tinyHash(block) };

    setChain((prev) => [...prev, confirmedBlock]);
    setSelectedWalletId(targetWallet.id);
    addLog(`Instant faucet confirmed: 500 ${SYMBOL} added to ${targetWallet.label}.`);
  }

  function sendTransaction() {
    const value = Number(amount);
    const fee = Math.max(0.01, value * 0.0025);

    if (!selectedWallet) return addLog("No wallet selected.");
    if (selectedWallet.address === "GENESIS_RESERVE") {
      return addLog("Transaction blocked: select a user wallet first, not the genesis reserve.");
    }
    if (!recipient.trim()) return addLog("Transaction blocked: recipient address missing.");
    if (!value || value <= 0) return addLog("Transaction blocked: amount must be greater than zero.");
    if ((spendableBalances[selectedWallet.address] || 0) < value + fee) {
      return addLog("AI risk check blocked transaction: insufficient confirmed balance.");
    }
    if (recipient === selectedWallet.address) {
      return addLog("AI risk check warning: sending to yourself is disabled in this demo.");
    }

    const tx = {
      id: safeRandomId(),
      from: selectedWallet.address,
      to: recipient.trim(),
      amount: value,
      fee,
      note: "User transfer",
      riskScore: value > 250 ? "Medium" : "Low",
      createdAt: new Date().toLocaleString(),
    };

    setPending((prev) => [...prev, tx]);
    setRecipient("");
    setAmount("");
    addLog(`Transaction queued: ${format(value)} ${SYMBOL} plus ${format(fee)} fee. Risk: ${tx.riskScore}.`);
  }

  function mineBlock() {
    if (!selectedWallet) return addLog("No miner wallet selected.");
    if (pending.length === 0 && selectedWallet.address === "GENESIS_RESERVE") {
      return addLog("Create/select a user wallet before mining a reward block.");
    }

    const rewardTx = {
      id: safeRandomId(),
      from: "NETWORK",
      to: selectedWallet.address,
      amount: BLOCK_REWARD,
      fee: 0,
      note: "Block reward",
      createdAt: new Date().toLocaleString(),
    };

    const validatorFeeReward = pending.reduce((sum, tx) => sum + (tx.fee || 0), 0);
    const txs = [...pending, rewardTx];
    const previousHash = chain[chain.length - 1].hash;
    let nonce = 0;
    let block = null;
    let hash = "";
    const prefix = "0".repeat(difficulty);

    do {
      block = {
        index: chain.length,
        timestamp: new Date().toLocaleString(),
        transactions: txs,
        previousHash,
        nonce,
      };
      hash = tinyHash(block);
      nonce += 1;
    } while (!hash.startsWith(prefix) && nonce < 50_000);

    const mined = { ...block, hash };
    setChain((prev) => [...prev, mined]);
    setPending([]);

    if (validators.length > 0) {
      setRewardPool((prev) => prev + BLOCK_REWARD + validatorFeeReward);
      addLog(
        `Block #${mined.index} mined. ${format(
          BLOCK_REWARD + validatorFeeReward
        )} ${SYMBOL} added to validator reward pool.`
      );
    } else {
      addLog(`Block #${mined.index} mined with ${txs.length} transaction(s). Reward: ${BLOCK_REWARD} ${SYMBOL}.`);
    }
  }

  function becomeValidator() {
    const stake = Number(stakeAmount);

    if (!selectedWallet || selectedWallet.address === "GENESIS_RESERVE") {
      return addLog("Validator setup blocked: select a user wallet first.");
    }

    if (!stake || stake < 25) {
      return addLog("Validator setup blocked: minimum stake is 25 WBN.");
    }

    if (selectedBalance < stake) {
      return addLog("Validator setup blocked: not enough WBN in selected wallet.");
    }

    const existing = validators.find((validator) => validator.address === selectedWallet.address);

    if (existing) {
      setValidators((prev) =>
        prev.map((validator) =>
          validator.address === selectedWallet.address
            ? { ...validator, stake: validator.stake + stake, status: "Active" }
            : validator
        )
      );
      addLog(`${selectedWallet.label} increased validator stake by ${format(stake)} ${SYMBOL}.`);
      return;
    }

    setValidators((prev) => [
      ...prev,
      {
        id: safeRandomId(),
        label: selectedWallet.label,
        address: selectedWallet.address,
        stake,
        status: "Active",
        joinedAt: new Date().toLocaleString(),
      },
    ]);
    addLog(`${selectedWallet.label} became an active validator with ${format(stake)} ${SYMBOL} staked.`);
  }

  function unstakeValidator() {
    if (!selectedValidator) {
      return addLog("Unstake blocked: selected wallet is not an active validator.");
    }

    setValidators((prev) => prev.filter((validator) => validator.address !== selectedValidator.address));
    addLog(`${selectedValidator.label} unstaked ${format(selectedValidator.stake)} ${SYMBOL} and left the validator set.`);
  }

  function claimValidatorRewards() {
    if (!selectedValidator) {
      return addLog("Reward claim blocked: selected wallet is not an active validator.");
    }

    if (selectedRewardShare <= 0) {
      return addLog("Reward claim blocked: no validator rewards available yet.");
    }

    const rewardTx = {
      id: safeRandomId(),
      from: "NETWORK",
      to: selectedValidator.address,
      amount: selectedRewardShare,
      fee: 0,
      note: "Validator reward claim",
      createdAt: new Date().toLocaleString(),
    };

    const previousHash = chain[chain.length - 1].hash;
    const block = {
      index: chain.length,
      timestamp: new Date().toLocaleString(),
      transactions: [rewardTx],
      previousHash,
      nonce: 0,
    };
    const confirmedBlock = { ...block, hash: tinyHash(block) };

    setChain((prev) => [...prev, confirmedBlock]);
    setRewardPool((prev) => Math.max(0, prev - selectedRewardShare));
    addLog(`${selectedValidator.label} claimed ${format(selectedRewardShare)} ${SYMBOL} in validator rewards.`);
  }

  function createProposal() {
    if (!proposalTitle.trim()) {
      return addLog("Governance proposal blocked: title is required.");
    }

    const nextProposal = {
      id: safeRandomId(),
      title: proposalTitle.trim(),
      description: proposalDescription.trim() || "No description provided.",
      status: "Open",
      createdAt: new Date().toLocaleString(),
      votes: {},
    };

    setProposals((prev) => [nextProposal, ...prev]);
    setProposalTitle("");
    setProposalDescription("");
    addLog(`Governance proposal created: ${nextProposal.title}`);
  }

  function voteOnProposal(proposalId, choice) {
    if (!selectedValidator) {
      return addLog("Vote blocked: selected wallet must be an active validator.");
    }

    setProposals((prev) =>
      prev.map((proposal) =>
        proposal.id === proposalId
          ? {
              ...proposal,
              votes: {
                ...proposal.votes,
                [selectedValidator.address]: {
                  choice,
                  stake: selectedValidator.stake,
                  label: selectedValidator.label,
                  votedAt: new Date().toLocaleString(),
                },
              },
            }
          : proposal
      )
    );
    addLog(`${selectedValidator.label} voted ${choice.toUpperCase()} with ${format(selectedValidator.stake)} ${SYMBOL} voting power.`);
  }

  function closeProposal(proposalId) {
    setProposals((prev) =>
      prev.map((proposal) =>
        proposal.id === proposalId ? { ...proposal, status: "Closed" } : proposal
      )
    );
    addLog("Governance proposal closed.");
  }

  function validateChain() {
    for (let i = 1; i < chain.length; i += 1) {
      if (chain[i].previousHash !== chain[i - 1].hash) {
        addLog(`Chain validation failed at block #${i}.`);
        return false;
      }
    }

    addLog("Chain validation passed. Every block links correctly.");
    return true;
  }

  function exportNodeData() {
    const data = JSON.stringify(
      { chain, wallets, pending, selectedWalletId, validators, proposals, rewardPool, exportedAt: new Date().toISOString() },
      null,
      2
    );

    setExportData(data);
    addLog("Node export package generated.");
  }

  function importNodeData() {
    try {
      const parsed = JSON.parse(importData);
      if (!parsed?.chain?.length || !parsed?.wallets?.length) {
        return addLog("Import failed: package must include chain and wallets.");
      }

      setChain(parsed.chain);
      setWallets(parsed.wallets);
      setPending(parsed.pending || []);
      setSelectedWalletId(parsed.selectedWalletId || parsed.wallets[0]?.id || null);
      setValidators(parsed.validators || []);
      setRewardPool(parsed.rewardPool || 0);
      setProposals(parsed.proposals || proposals);
      setImportData("");
      addLog("Node import complete. Chain, wallets, and pending pool restored.");
    } catch {
      addLog("Import failed: invalid JSON package.");
    }
  }

  function resetNetwork() {
    const next = buildFreshNetwork();
    setChain(next.chain);
    setWallets(next.wallets);
    setPending([]);
    setLogs(["Network reset complete. Fresh genesis block created.", ...next.logs]);
    setSelectedWalletId(null);
    setSelectedReceiptId(null);
    setValidators([]);
    setRewardPool(0);
    setProposals([
      {
        id: "proposal-genesis-1",
        title: "Adopt AI-assisted fraud alerts",
        description:
          "Enable Webnett's AI layer to flag suspicious demo transfers before they are queued.",
        status: "Open",
        createdAt: "Genesis Proposal",
        votes: {},
      },
    ]);
    setExportData("");
    setImportData("");

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  function useRecipientAddress(address) {
    setRecipient(address);
    setActiveTab("send");
    addLog(`Recipient loaded: ${address}`);
  }

  function quickSendToWallet(wallet) {
    if (!wallet) return;
    if (wallet.address === selectedWallet?.address) {
      return addLog("Pick a different wallet to send funds to.");
    }

    setRecipient(wallet.address);
    setAmount("25");
    setActiveTab("send");
    addLog(`Quick send prepared: 25 ${SYMBOL} to ${wallet.label}.`);
  }

  const readmeCopy = `# Webnett Network Prototype

Webnett Network is a trust-first digital currency prototype with demo wallets, WBN transfers, block mining, validator staking, governance voting, reward pools, and an explorer.

## Important disclaimer

This is experimental software for demonstration only. WBN in this prototype has no real-world value and is not an investment product.`;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-7xl px-4 py-8 md:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]"
        >
          <Card className="border-white/10 bg-white/5 shadow-2xl backdrop-blur">
            <CardContent className="p-8">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <Badge className="bg-cyan-400/15 text-cyan-200 hover:bg-cyan-400/15">Prototype Testnet</Badge>
                <Badge className="bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15">AI Security Layer</Badge>
                <Badge className="bg-violet-400/15 text-violet-200 hover:bg-violet-400/15">Currency Network</Badge>
              </div>

              <h1 className="text-4xl font-black tracking-tight md:text-6xl">
                Webnett Network
                <span className="block bg-gradient-to-r from-cyan-300 via-emerald-300 to-violet-300 bg-clip-text text-transparent">
                  A new trust-first currency era.
                </span>
              </h1>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
                A working prototype for a new digital currency network: demo wallets, WBN transfers, mining, explorer receipts, validator staking, governance voting, and reward pools. This is a software prototype, not a live financial asset.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                {productFeatures.map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="font-bold text-cyan-200">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button onClick={createWallet} className="rounded-2xl px-5 py-6 text-base">
                  <Wallet className="mr-2 h-5 w-5" /> Create Wallet
                </Button>
                <Button onClick={mineBlock} variant="secondary" className="rounded-2xl px-5 py-6 text-base">
                  <Pickaxe className="mr-2 h-5 w-5" /> Mine Block
                </Button>
                <Button
                  onClick={validateChain}
                  variant="outline"
                  className="rounded-2xl border-white/20 bg-white/5 px-5 py-6 text-base text-white hover:bg-white/10"
                >
                  <Shield className="mr-2 h-5 w-5" /> Validate Chain
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 shadow-2xl backdrop-blur">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-cyan-400/15 p-3">
                  <Cpu className="h-6 w-6 text-cyan-200" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Node Status</h2>
                  <p className="text-sm text-slate-400">Local Webnett prototype node</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between rounded-2xl bg-black/20 p-3">
                  <span>Network</span>
                  <span className="text-emerald-300">Online</span>
                </div>
                <div className="flex justify-between rounded-2xl bg-black/20 p-3">
                  <span>Consensus</span>
                  <span>Demo Proof-of-Work</span>
                </div>
                <div className="flex justify-between rounded-2xl bg-black/20 p-3">
                  <span>Block Reward</span>
                  <span>{BLOCK_REWARD} {SYMBOL}</span>
                </div>
                <div className="flex justify-between rounded-2xl bg-black/20 p-3">
                  <span>Max Supply</span>
                  <span>{MAX_SUPPLY.toLocaleString()} {SYMBOL}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        <section className="mt-6 grid gap-4 md:grid-cols-7">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <Icon className="h-5 w-5 text-cyan-200" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">{stat.label}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="mt-8">
          <Card className="mb-6 border-emerald-400/20 bg-emerald-400/10 backdrop-blur">
            <CardContent className="p-5">
              <h2 className="mb-4 text-2xl font-black">Simple Test Path</h2>
              <div className="grid gap-3 md:grid-cols-4">
                {guideSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className={`rounded-2xl border p-4 ${
                      step.done ? "border-emerald-300 bg-emerald-300/10" : "border-white/10 bg-black/20"
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      {step.done ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                      ) : (
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-xs">
                          {index + 1}
                        </span>
                      )}
                      <b>{step.title}</b>
                    </div>
                    <p className="text-sm text-slate-300">{step.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid w-full grid-cols-2 gap-2 rounded-2xl bg-white/10 p-2 text-slate-300 md:grid-cols-8">
            {[
              ["wallet", "Wallet"],
              ["send", "Send"],
              ["explorer", "Explorer"],
              ["validators", "Validators"],
              ["governance", "Governance"],
              ["launch", "Launch Center"],
              ["repo", "Repo Kit"],
              ["node", "Advanced"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  activeTab === value
                    ? "bg-white text-slate-950 shadow-lg"
                    : "bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "wallet" && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                    <Wallet className="h-6 w-6 text-cyan-200" /> Step 1: Create & Fund
                  </h2>
                  <Input
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    placeholder="Wallet name, example: James Wallet"
                    className="mb-3 rounded-2xl border-white/10 bg-black/30 text-white placeholder:text-slate-500"
                  />
                  <Button onClick={createWallet} className="w-full rounded-2xl py-6">
                    Generate New Wallet
                  </Button>
                  <button
                    type="button"
                    onClick={() => requestFaucet(selectedWallet)}
                    className="mt-3 w-full rounded-2xl bg-emerald-400 px-4 py-4 font-bold text-slate-950 shadow-lg transition hover:bg-emerald-300"
                  >
                    Add Test Money +500 WBN
                  </button>
                  <p className="mt-4 rounded-2xl bg-black/25 p-4 text-sm leading-6 text-slate-300">
                    Current selected wallet: <b>{selectedWallet?.label}</b>
                    <br />
                    Spendable: <b className="text-emerald-300">{format(selectedBalance)} {SYMBOL}</b>
                    <br />
                    Locked stake: <b className="text-cyan-200">{format(selectedStake)} {SYMBOL}</b>
                  </p>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-6">
                  <h2 className="mb-4 text-2xl font-bold">Your Demo Wallets</h2>

                  {userWallets.length === 0 && (
                    <p className="rounded-2xl bg-black/25 p-4 text-slate-300">
                      No user wallets yet. Click Generate New Wallet first.
                    </p>
                  )}

                  <div className="grid gap-3">
                    {userWallets.map((w) => (
                      <div
                        key={w.id}
                        onClick={() => setSelectedWalletId(w.id)}
                        className={`cursor-pointer rounded-2xl border p-4 text-left transition ${
                          selectedWallet?.address === w.address
                            ? "border-cyan-300 bg-cyan-300/10"
                            : "border-white/10 bg-black/20 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-bold">{w.label}</p>
                            <p className="break-all text-sm text-slate-400">{w.address}</p>
                          </div>
                          <Badge className="bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15">
                            {format(spendableBalances[w.address] || 0)} {SYMBOL}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestFaucet(w);
                            }}
                            className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
                          >
                            Add +500 WBN
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              useRecipientAddress(w.address);
                            }}
                            className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20"
                          >
                            Use as Recipient
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              quickSendToWallet(w);
                            }}
                            className="rounded-xl bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                          >
                            Quick Send 25
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "send" && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                    <Send className="h-6 w-6 text-cyan-200" /> Send Lab
                  </h2>

                  <div className="mb-4 rounded-2xl bg-black/25 p-4 text-sm">
                    <p className="text-slate-400">Sending from</p>
                    <p className="break-all font-semibold">
                      {selectedWallet?.label} — {selectedWallet?.address}
                    </p>
                    <p className="mt-2 text-emerald-300">
                      Spendable balance: {format(selectedBalance)} {SYMBOL} · Locked stake: {format(selectedStake)} {SYMBOL}
                    </p>
                  </div>

                  <Input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Recipient address"
                    className="mb-3 rounded-2xl border-white/10 bg-black/30 text-white placeholder:text-slate-500"
                  />
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                    type="number"
                    className="mb-3 rounded-2xl border-white/10 bg-black/30 text-white placeholder:text-slate-500"
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <Button onClick={sendTransaction} className="rounded-2xl py-6">
                      <ArrowRightLeft className="mr-2 h-5 w-5" /> Queue Transfer
                    </Button>
                    <Button onClick={mineBlock} variant="secondary" className="rounded-2xl py-6">
                      <Pickaxe className="mr-2 h-5 w-5" /> Confirm / Mine
                    </Button>
                  </div>

                  <div className="mt-5 rounded-2xl bg-black/25 p-4">
                    <p className="mb-3 text-sm font-bold text-slate-300">Pick recipient wallet</p>
                    <div className="space-y-2">
                      {userWallets
                        .filter((w) => w.address !== selectedWallet?.address)
                        .map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => useRecipientAddress(w.address)}
                            className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10"
                          >
                            <span>{w.label}</span>
                            <span className="text-slate-400">{shortAddress(w.address)}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                    <SearchCheck className="h-6 w-6 text-emerald-200" /> Audit Console
                  </h2>

                  <div className="mb-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-black/25 p-4 text-sm">
                      <b>{pending.length}</b>
                      <br />
                      <span className="text-slate-400">Pending transfers</span>
                    </div>
                    <div className="rounded-2xl bg-black/25 p-4 text-sm">
                      <b>{format(totalFeesPending)} {SYMBOL}</b>
                      <br />
                      <span className="text-slate-400">Pending fees</span>
                    </div>
                    <div className="rounded-2xl bg-black/25 p-4 text-sm">
                      <b>{pendingRisk}</b>
                      <br />
                      <span className="text-slate-400">AI risk status</span>
                    </div>
                    <div className="rounded-2xl bg-black/25 p-4 text-sm">
                      <b>{chainLooksLinked ? "Passed" : "Failed"}</b>
                      <br />
                      <span className="text-slate-400">Chain link audit</span>
                    </div>
                  </div>

                  {pending.length > 0 && (
                    <div className="mb-5 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm text-yellow-100">
                      <div className="mb-2 flex items-center gap-2 font-bold">
                        <AlertTriangle className="h-5 w-5" /> Pending confirmation needed
                      </div>
                      Click Confirm / Mine to finalize the queued transfer into the blockchain history.
                    </div>
                  )}

                  <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                    <Lock className="h-5 w-5 text-emerald-200" /> Event Log
                  </h3>
                  <div className="space-y-3">
                    {logs.map((log, idx) => (
                      <div key={`${log}_${idx}`} className="rounded-2xl bg-black/25 p-3 text-sm text-slate-300">
                        {log}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "explorer" && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                    <Database className="h-6 w-6 text-cyan-200" /> Pending Pool
                  </h2>
                  {pending.length === 0 ? (
                    <p className="text-slate-400">
                      No pending transactions. Faucet funds now confirm instantly. Send a transfer to create a pending transaction.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {pending.map((tx) => (
                        <div key={tx.id} className="rounded-2xl bg-black/25 p-3 text-sm">
                          <p className="font-bold">{format(tx.amount)} {SYMBOL}</p>
                          <p className="break-all text-slate-400">From: {tx.from}</p>
                          <p className="break-all text-slate-400">To: {tx.to}</p>
                          <p className="text-slate-500">Fee: {format(tx.fee)} {SYMBOL}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-5 rounded-2xl bg-black/20 p-4">
                    <label className="text-sm text-slate-400">Mining difficulty: {difficulty}</label>
                    <input
                      className="mt-3 w-full"
                      type="range"
                      min="1"
                      max="4"
                      value={difficulty}
                      onChange={(e) => setDifficulty(Number(e.target.value))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                    <Blocks className="h-6 w-6 text-violet-200" /> Block Explorer
                  </h2>

                  <div className="mb-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-black/25 p-4 text-sm">
                      <b>{chainLooksLinked ? "Healthy" : "Broken"}</b>
                      <br />
                      <span className="text-slate-400">Chain status</span>
                    </div>
                    <div className="rounded-2xl bg-black/25 p-4 text-sm">
                      <b>{shortAddress(lastBlock?.hash)}</b>
                      <br />
                      <span className="text-slate-400">Latest hash</span>
                    </div>
                    <div className="rounded-2xl bg-black/25 p-4 text-sm">
                      <b>{userTransfers.length}</b>
                      <br />
                      <span className="text-slate-400">User transfers</span>
                    </div>
                  </div>

                  <div className="mb-5 rounded-2xl bg-black/25 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                      <ReceiptText className="h-5 w-5 text-cyan-200" /> Transaction Receipt
                    </h3>
                    {selectedReceipt ? (
                      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <b className="text-lg">{format(selectedReceipt.amount)} {SYMBOL}</b>
                          <Badge className="bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15">Confirmed</Badge>
                        </div>
                        <p><span className="text-slate-400">Receipt ID:</span> {shortAddress(`${selectedReceipt.blockHash}-${selectedReceipt.id}`)}</p>
                        <p><span className="text-slate-400">Block:</span> #{selectedReceipt.blockIndex}</p>
                        <p><span className="text-slate-400">Fee:</span> {format(selectedReceipt.fee)} {SYMBOL}</p>
                        <p><span className="text-slate-400">Type:</span> {selectedReceipt.note}</p>
                        <p className="break-all"><span className="text-slate-400">From:</span> {selectedReceipt.from}</p>
                        <p className="break-all"><span className="text-slate-400">To:</span> {selectedReceipt.to}</p>
                      </div>
                    ) : (
                      <p className="text-slate-400">No receipt selected yet. Confirm a transaction to generate one.</p>
                    )}
                  </div>

                  <div className="mb-5 rounded-2xl bg-black/25 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                      <Send className="h-5 w-5 text-cyan-200" /> Confirmed Transaction History
                    </h3>
                    <div className="max-h-72 space-y-2 overflow-auto pr-1">
                      {confirmedTransactions.map((tx) => {
                        const receiptId = `${tx.blockHash}-${tx.id}`;
                        return (
                          <button
                            key={receiptId}
                            type="button"
                            onClick={() => setSelectedReceiptId(receiptId)}
                            className={`w-full rounded-xl p-3 text-left text-sm transition ${
                              selectedReceiptId === receiptId
                                ? "bg-cyan-400 text-slate-950"
                                : "bg-white/5 hover:bg-white/10"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <b>{format(tx.amount)} {SYMBOL}</b>
                              <span className={selectedReceiptId === receiptId ? "text-slate-800" : "text-slate-500"}>
                                Block #{tx.blockIndex}
                              </span>
                            </div>
                            <p className="break-all opacity-80">From: {tx.from}</p>
                            <p className="break-all opacity-80">To: {tx.to}</p>
                            <p className="opacity-70">{tx.note}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[...chain].reverse().map((block) => (
                      <div key={block.hash} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-lg font-bold">Block #{block.index}</h3>
                          <Badge className="bg-violet-400/15 text-violet-200 hover:bg-violet-400/15">
                            {(block.transactions || []).length} TX
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">{block.timestamp}</p>
                        <p className="mt-2 break-all text-sm"><span className="text-slate-500">Hash:</span> {block.hash}</p>
                        <p className="break-all text-sm"><span className="text-slate-500">Previous:</span> {block.previousHash}</p>
                        <p className="text-sm text-slate-500">Nonce: {block.nonce}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "validators" && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                    <Shield className="h-6 w-6 text-cyan-200" /> Validator Staking
                  </h2>
                  <p className="mb-4 text-sm leading-6 text-slate-400">
                    Stake demo WBN from the selected wallet to become a validator.
                  </p>

                  <div className="mb-4 rounded-2xl bg-black/25 p-4 text-sm">
                    <p className="text-slate-400">Selected wallet</p>
                    <p className="break-all font-semibold">{selectedWallet?.label} — {selectedWallet?.address}</p>
                    <p className="mt-2 text-emerald-300">Spendable: {format(selectedBalance)} {SYMBOL}</p>
                    <p className="mt-1 text-cyan-200">Locked stake: {format(selectedStake)} {SYMBOL} · Voting power: {format(selectedVotingPower)}%</p>
                    <p className="mt-1 text-violet-200">Claimable rewards: {format(selectedRewardShare)} {SYMBOL}</p>
                  </div>

                  <Input
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="Stake amount, minimum 25 WBN"
                    type="number"
                    className="mb-3 rounded-2xl border-white/10 bg-black/30 text-white placeholder:text-slate-500"
                  />
                  <div className="grid gap-3 md:grid-cols-3">
                    <Button onClick={becomeValidator} className="rounded-2xl py-6">
                      <Shield className="mr-2 h-5 w-5" /> Stake
                    </Button>
                    <Button onClick={claimValidatorRewards} variant="secondary" className="rounded-2xl py-6">
                      Claim Rewards
                    </Button>
                    <Button onClick={unstakeValidator} variant="outline" className="rounded-2xl border-white/20 bg-white/5 py-6 text-white hover:bg-white/10">
                      Unstake
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-black/25 p-4 text-sm"><b>{validators.length}</b><br /><span className="text-slate-400">Active validators</span></div>
                    <div className="rounded-2xl bg-black/25 p-4 text-sm"><b>{format(totalStaked)} {SYMBOL}</b><br /><span className="text-slate-400">Locked security stake</span></div>
                    <div className="rounded-2xl bg-black/25 p-4 text-sm"><b>{format(rewardPool)} {SYMBOL}</b><br /><span className="text-slate-400">Reward pool</span></div>
                    <div className="rounded-2xl bg-black/25 p-4 text-sm"><b>{validators.length >= 3 ? "Stronger" : validators.length > 0 ? "Starting" : "Unsecured"}</b><br /><span className="text-slate-400">Security level</span></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                    <Vote className="h-6 w-6 text-emerald-200" /> Validator Set
                  </h2>
                  {validators.length === 0 ? (
                    <p className="rounded-2xl bg-black/25 p-4 text-slate-300">
                      No validators yet. Select a funded wallet and stake WBN to start securing the demo network.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {validators
                        .slice()
                        .sort((a, b) => b.stake - a.stake)
                        .map((validator) => {
                          const power = totalStaked > 0 ? (validator.stake / totalStaked) * 100 : 0;
                          return (
                            <div key={validator.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="font-bold">{validator.label}</p>
                                  <p className="break-all text-sm text-slate-400">{validator.address}</p>
                                </div>
                                <Badge className="bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15">{validator.status}</Badge>
                              </div>
                              <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                                <div className="rounded-xl bg-white/5 p-3"><b>{format(validator.stake)} {SYMBOL}</b><br /><span className="text-slate-400">Stake</span></div>
                                <div className="rounded-xl bg-white/5 p-3"><b>{format(power)}%</b><br /><span className="text-slate-400">Voting power</span></div>
                                <div className="rounded-xl bg-white/5 p-3"><b>{format(rewardPool * (validator.stake / totalStaked))} {SYMBOL}</b><br /><span className="text-slate-400">Claimable</span></div>
                                <div className="rounded-xl bg-white/5 p-3"><b>{validator.joinedAt}</b><br /><span className="text-slate-400">Joined</span></div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "governance" && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                    <Vote className="h-6 w-6 text-cyan-200" /> Governance Control
                  </h2>

                  <Input
                    value={proposalTitle}
                    onChange={(e) => setProposalTitle(e.target.value)}
                    placeholder="Proposal title"
                    className="mb-3 rounded-2xl border-white/10 bg-black/30 text-white placeholder:text-slate-500"
                  />
                  <textarea
                    value={proposalDescription}
                    onChange={(e) => setProposalDescription(e.target.value)}
                    placeholder="Proposal description"
                    className="mb-3 min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white placeholder:text-slate-500"
                  />
                  <Button onClick={createProposal} className="w-full rounded-2xl py-6">
                    <Rocket className="mr-2 h-5 w-5" /> Create Proposal
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                    <SearchCheck className="h-6 w-6 text-emerald-200" /> Proposal Board
                  </h2>
                  <div className="space-y-4">
                    {proposals.map((proposal) => {
                      const votes = Object.values(proposal.votes || {});
                      const yesPower = votes.filter((vote) => vote.choice === "yes").reduce((sum, vote) => sum + vote.stake, 0);
                      const noPower = votes.filter((vote) => vote.choice === "no").reduce((sum, vote) => sum + vote.stake, 0);
                      const totalVotePower = yesPower + noPower;
                      const yesPercent = totalVotePower > 0 ? (yesPower / totalVotePower) * 100 : 0;

                      return (
                        <div key={proposal.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h3 className="text-lg font-bold">{proposal.title}</h3>
                              <p className="text-xs text-slate-500">Created: {proposal.createdAt}</p>
                            </div>
                            <Badge className="bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15">
                              {proposal.status}
                            </Badge>
                          </div>
                          <p className="mb-4 text-sm leading-6 text-slate-300">{proposal.description}</p>
                          <p className="mb-3 text-sm text-slate-400">
                            Yes: {format(yesPower)} {SYMBOL} · No: {format(noPower)} {SYMBOL} · Yes %: {format(yesPercent)}%
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => voteOnProposal(proposal.id, "yes")} disabled={proposal.status !== "Open"} className="rounded-xl">Vote Yes</Button>
                            <Button onClick={() => voteOnProposal(proposal.id, "no")} disabled={proposal.status !== "Open"} variant="secondary" className="rounded-xl">Vote No</Button>
                            <Button onClick={() => closeProposal(proposal.id)} disabled={proposal.status !== "Open"} variant="outline" className="rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10">Close Vote</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "launch" && (
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <Card className="border-white/10 bg-white/5 backdrop-blur lg:col-span-2">
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-3xl font-black">
                    <Rocket className="h-7 w-7 text-cyan-200" /> Launch Center
                  </h2>
                  <p className="text-lg leading-8 text-slate-300">
                    Webnett Network is a working prototype with wallets, transfers, mining, explorer history, validators, governance, locked stake, and rewards.
                  </p>

                  <div className="mt-6 rounded-2xl bg-black/25 p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-xl font-bold"><Target className="h-5 w-5 text-emerald-200" /> Testnet Readiness</h3>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {launchReadiness.map((item) => (
                        <div key={item.label} className={`rounded-2xl border p-4 text-sm ${item.ready ? "border-emerald-300/30 bg-emerald-300/10" : "border-yellow-300/30 bg-yellow-300/10"}`}>
                          <div className="mb-1 flex items-center gap-2 font-bold">
                            {item.ready ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <AlertTriangle className="h-4 w-4 text-yellow-300" />}
                            {item.label}
                          </div>
                          <p className="text-slate-300">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                    <Sparkles className="h-6 w-6 text-emerald-200" /> Public Demo Copy
                  </h2>
                  <div className="rounded-2xl bg-black/25 p-4 text-sm leading-6 text-slate-300">
                    <p className="font-bold text-white">Webnett Network Prototype</p>
                    <p className="mt-2">
                      A trust-first digital currency experiment with demo wallets, block mining, validator staking, governance voting, reward pools, and an explorer for transparent activity.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "repo" && (
            <Card className="mt-6 border-white/10 bg-white/5 backdrop-blur">
              <CardContent className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                  <Terminal className="h-6 w-6 text-cyan-200" /> GitHub Repo Kit
                </h2>
                <textarea
                  value={readmeCopy}
                  readOnly
                  className="min-h-72 w-full rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-xs text-white"
                />
              </CardContent>
            </Card>
          )}

          {activeTab === "node" && (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
                    <Database className="h-6 w-6 text-cyan-200" /> Advanced Tools
                  </h2>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Button onClick={exportNodeData} className="rounded-2xl py-6">
                      <Copy className="mr-2 h-5 w-5" /> Generate Export
                    </Button>
                    <Button onClick={resetNetwork} variant="destructive" className="rounded-2xl py-6">
                      Reset Network
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-6">
                  <h2 className="mb-4 text-2xl font-bold">Export / Import Package</h2>
                  <textarea
                    value={exportData}
                    onChange={(e) => setExportData(e.target.value)}
                    placeholder="Click Generate Export to create a JSON package of this node."
                    className="min-h-40 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white placeholder:text-slate-500"
                  />
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste a Webnett node JSON package here to import it."
                    className="mt-3 min-h-32 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white placeholder:text-slate-500"
                  />
                  <Button onClick={importNodeData} variant="secondary" className="mt-3 w-full rounded-2xl py-6">
                    Import Node Package
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}