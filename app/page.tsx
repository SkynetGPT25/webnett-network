// @ts-nocheck
"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Blocks,
  CheckCircle2,
  Coins,
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
  Vote,
  Wallet,
  Users,
} from "lucide-react";

const SYMBOL = "WBN";
const BLOCK_REWARD = 25;
const MAX_SUPPLY = 100_000_000;
const STORAGE_KEY = "webnett-local-node";

function id() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function hash(input: any) {
  let h = 2166136261;
  const s = JSON.stringify(input);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return `${(h >>> 0).toString(16).padStart(8, "0")}${Math.abs(h).toString(36)}`;
}

function fmt(n: any) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function short(a = "") {
  return a.length > 16 ? `${a.slice(0, 10)}...${a.slice(-6)}` : a;
}

function wallet(label = "Wallet") {
  const seed = `${label}_${Date.now()}_${Math.random()}`;
  return {
    id: id(),
    label,
    address: `wbn_${hash(seed).slice(0, 18)}`,
    privateKey: `priv_${hash(seed + "_private").repeat(3).slice(0, 48)}`,
    createdAt: new Date().toLocaleString(),
  };
}

function genesisBlock() {
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

function fresh() {
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

function balances(chain: any[], pending: any[] = []) {
  const b: any = {};
  for (const block of chain) {
    for (const tx of block.transactions || []) {
      if (tx.from !== "NETWORK") b[tx.from] = (b[tx.from] || 0) - tx.amount - (tx.fee || 0);
      b[tx.to] = (b[tx.to] || 0) + tx.amount;
    }
  }
  for (const tx of pending) {
    if (tx.from !== "NETWORK") b[tx.from] = (b[tx.from] || 0) - tx.amount - (tx.fee || 0);
  }
  return b;
}

function Btn({ children, onClick, variant = "primary", disabled = false }: any) {
  const styles: any = {
    primary: "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
    green: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
    purple: "bg-violet-400 text-slate-950 hover:bg-violet-300",
    dark: "bg-white/10 text-white hover:bg-white/20",
    danger: "bg-red-500 text-white hover:bg-red-400",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-4 py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "" }: any) {
  return <div className={`rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur ${className}`}>{children}</div>;
}

function InputBox(props: any) {
  return <input {...props} className={`w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-slate-500 ${props.className || ""}`} />;
}

export default function Home() {
  const initial = useMemo(() => fresh(), []);
  const [chain, setChain] = useState(initial.chain);
  const [wallets, setWallets] = useState(initial.wallets);
  const [pending, setPending] = useState(initial.pending);
  const [logs, setLogs] = useState(initial.logs);
  const [validators, setValidators] = useState(initial.validators);
  const [rewardPool, setRewardPool] = useState(initial.rewardPool);
  const [proposals, setProposals] = useState(initial.proposals);
  const [selectedWalletId, setSelectedWalletId] = useState(null);
  const [tab, setTab] = useState("wallet");
  const [walletName, setWalletName] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [stakeAmount, setStakeAmount] = useState("100");
  const [proposalTitle, setProposalTitle] = useState("Increase faucet reward to 750 WBN");
  const [proposalDesc, setProposalDesc] = useState("Demo governance vote for validator-weighted decisions.");
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const p = JSON.parse(saved);
      if (p.chain?.length) {
        setChain(p.chain);
        setWallets(p.wallets || initial.wallets);
        setPending(p.pending || []);
        setLogs(p.logs || initial.logs);
        setValidators(p.validators || []);
        setRewardPool(p.rewardPool || 0);
        setProposals(p.proposals || initial.proposals);
        setSelectedWalletId(p.selectedWalletId || null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ chain, wallets, pending, logs, validators, rewardPool, proposals, selectedWalletId })
      );
    } catch {}
  }, [chain, wallets, pending, logs, validators, rewardPool, proposals, selectedWalletId]);

  const bal = useMemo(() => balances(chain, pending), [chain, pending]);
  const userWallets = wallets.filter((w: any) => w.address !== "GENESIS_RESERVE");
  const selectedWallet = wallets.find((w: any) => w.id === selectedWalletId) || userWallets[0] || wallets[0];

  const txs = useMemo(
    () =>
      chain
        .flatMap((block: any) =>
          (block.transactions || []).map((tx: any) => ({ ...tx, blockIndex: block.index, blockHash: block.hash }))
        )
        .reverse(),
    [chain]
  );

  const userTransfers = txs.filter((tx: any) => tx.note === "User transfer");
  const selectedValidator = validators.find((v: any) => v.address === selectedWallet?.address);
  const selectedStake = selectedValidator?.stake || 0;
  const rawBalance = bal[selectedWallet?.address] || 0;
  const spendable = Math.max(0, rawBalance - selectedStake);
  const totalStaked = validators.reduce((s: number, v: any) => s + v.stake, 0);
  const votingPower = totalStaked > 0 && selectedValidator ? (selectedValidator.stake / totalStaked) * 100 : 0;
  const rewardShare = totalStaked > 0 && selectedValidator ? rewardPool * (selectedValidator.stake / totalStaked) : 0;
  const chainHealthy = chain.every((b: any, i: number) => i === 0 || b.previousHash === chain[i - 1].hash);
  const latest = chain[chain.length - 1];

  function log(m: string) {
    setLogs((p: string[]) => [m, ...p].slice(0, 9));
  }

  function createWallet() {
    const w = wallet(walletName || `Wallet ${userWallets.length + 1}`);
    setWallets((p: any[]) => [...p, w]);
    setSelectedWalletId(w.id);
    setWalletName("");
    log(`New wallet created: ${w.address}`);
  }

  function faucet(w = selectedWallet) {
    if (!w || w.address === "GENESIS_RESERVE") return log("Create/select a user wallet first.");
    const tx = { id: id(), from: "NETWORK", to: w.address, amount: 500, fee: 0, note: "Instant faucet", createdAt: new Date().toLocaleString() };
    const block = { index: chain.length, timestamp: new Date().toLocaleString(), previousHash: latest.hash, nonce: 0, transactions: [tx] };
    setChain((p: any[]) => [...p, { ...block, hash: hash(block) }]);
    setSelectedWalletId(w.id);
    log(`Faucet confirmed: 500 ${SYMBOL} added to ${w.label}.`);
  }

  function queueTransfer() {
    const value = Number(amount);
    const fee = Math.max(0.01, value * 0.0025);
    if (!selectedWallet || selectedWallet.address === "GENESIS_RESERVE") return log("Select a funded user wallet first.");
    if (!recipient.trim()) return log("Recipient address missing.");
    if (!value || value <= 0) return log("Amount must be greater than zero.");
    if (recipient === selectedWallet.address) return log("Cannot send to yourself in this demo.");
    if (spendable < value + fee) return log("Blocked: insufficient spendable balance.");

    const tx = {
      id: id(),
      from: selectedWallet.address,
      to: recipient.trim(),
      amount: value,
      fee,
      note: "User transfer",
      riskScore: value > 250 ? "Medium" : "Low",
      createdAt: new Date().toLocaleString(),
    };
    setPending((p: any[]) => [...p, tx]);
    setRecipient("");
    setAmount("");
    log(`Queued ${fmt(value)} ${SYMBOL}. Fee: ${fmt(fee)}. Risk: ${tx.riskScore}.`);
  }

  function mineBlock() {
    if (!selectedWallet || selectedWallet.address === "GENESIS_RESERVE") return log("Select a user wallet first.");
    const feeReward = pending.reduce((s: number, tx: any) => s + (tx.fee || 0), 0);
    const rewardTx = { id: id(), from: "NETWORK", to: selectedWallet.address, amount: BLOCK_REWARD, fee: 0, note: "Block reward", createdAt: new Date().toLocaleString() };
    const block = {
      index: chain.length,
      timestamp: new Date().toLocaleString(),
      previousHash: latest.hash,
      nonce: Math.floor(Math.random() * 999999),
      transactions: [...pending, rewardTx],
    };
    setChain((p: any[]) => [...p, { ...block, hash: hash(block) }]);
    setPending([]);
    if (validators.length > 0) {
      setRewardPool((p: number) => p + BLOCK_REWARD + feeReward);
      log(`Block mined. ${fmt(BLOCK_REWARD + feeReward)} ${SYMBOL} added to validator reward pool.`);
    } else {
      log(`Block mined. Reward: ${BLOCK_REWARD} ${SYMBOL}.`);
    }
  }

  function validateChain() {
    log(chainHealthy ? "Chain validation passed." : "Chain validation failed.");
  }

  function stake() {
    const stake = Number(stakeAmount);
    if (!selectedWallet || selectedWallet.address === "GENESIS_RESERVE") return log("Select a user wallet first.");
    if (!stake || stake < 25) return log("Minimum stake is 25 WBN.");
    if (spendable < stake) return log("Not enough spendable WBN.");

    const existing = validators.find((v: any) => v.address === selectedWallet.address);
    if (existing) {
      setValidators((p: any[]) => p.map((v) => (v.address === selectedWallet.address ? { ...v, stake: v.stake + stake } : v)));
      log(`${selectedWallet.label} increased stake by ${fmt(stake)} ${SYMBOL}.`);
    } else {
      setValidators((p: any[]) => [
        ...p,
        { id: id(), label: selectedWallet.label, address: selectedWallet.address, stake, status: "Active", joinedAt: new Date().toLocaleString() },
      ]);
      log(`${selectedWallet.label} became a validator with ${fmt(stake)} ${SYMBOL}.`);
    }
  }

  function unstake() {
    if (!selectedValidator) return log("Selected wallet is not a validator.");
    setValidators((p: any[]) => p.filter((v) => v.address !== selectedValidator.address));
    log(`${selectedValidator.label} unstaked ${fmt(selectedValidator.stake)} ${SYMBOL}.`);
  }

  function claimRewards() {
    if (!selectedValidator) return log("Selected wallet is not a validator.");
    if (rewardShare <= 0) return log("No validator rewards available.");
    const tx = { id: id(), from: "NETWORK", to: selectedValidator.address, amount: rewardShare, fee: 0, note: "Validator reward claim", createdAt: new Date().toLocaleString() };
    const block = { index: chain.length, timestamp: new Date().toLocaleString(), previousHash: latest.hash, nonce: 0, transactions: [tx] };
    setChain((p: any[]) => [...p, { ...block, hash: hash(block) }]);
    setRewardPool((p: number) => Math.max(0, p - rewardShare));
    log(`${selectedValidator.label} claimed ${fmt(rewardShare)} ${SYMBOL}.`);
  }

  function createProposal() {
    if (!proposalTitle.trim()) return log("Proposal needs a title.");
    setProposals((p: any[]) => [
      {
        id: id(),
        title: proposalTitle.trim(),
        description: proposalDesc.trim() || "No description.",
        status: "Open",
        votes: {},
        createdAt: new Date().toLocaleString(),
      },
      ...p,
    ]);
    setProposalTitle("");
    setProposalDesc("");
    log("Governance proposal created.");
  }

  function vote(pid: string, choice: string) {
    if (!selectedValidator) return log("Only validators can vote.");
    setProposals((p: any[]) =>
      p.map((prop) =>
        prop.id === pid
          ? {
              ...prop,
              votes: {
                ...prop.votes,
                [selectedValidator.address]: { choice, stake: selectedValidator.stake, label: selectedValidator.label, votedAt: new Date().toLocaleString() },
              },
            }
          : prop
      )
    );
    log(`${selectedValidator.label} voted ${choice.toUpperCase()} with ${fmt(selectedValidator.stake)} ${SYMBOL}.`);
  }

  function closeProposal(pid: string) {
    setProposals((p: any[]) => p.map((prop) => (prop.id === pid ? { ...prop, status: "Closed" } : prop)));
    log("Proposal closed.");
  }

  function reset() {
    const f = fresh();
    setChain(f.chain);
    setWallets(f.wallets);
    setPending([]);
    setLogs(["Network reset complete.", ...f.logs]);
    setValidators([]);
    setRewardPool(0);
    setProposals(f.proposals);
    setSelectedWalletId(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  const statCards = [
    ["Blocks", chain.length, Blocks],
    ["Wallets", wallets.length, Wallet],
    ["Pending", pending.length, Activity],
    ["TX History", txs.length, ReceiptText],
    ["Validators", validators.length, Users],
    ["Reward Pool", `${fmt(rewardPool)} ${SYMBOL}`, Coins],
  ];

  const tabs = [
    ["wallet", "Wallet"],
    ["send", "Send"],
    ["explorer", "Explorer"],
    ["validators", "Validators"],
    ["governance", "Governance"],
    ["launch", "Launch"],
    ["advanced", "Advanced"],
  ];

  const readiness = [
    ["Wallets", userWallets.length >= 2, `${userWallets.length} wallet(s)`],
    ["Transfers", userTransfers.length > 0, `${userTransfers.length} transfer(s)`],
    ["Validators", validators.length > 0, `${validators.length} validator(s)`],
    ["Governance", proposals.length > 0, `${proposals.length} proposal(s)`],
    ["Chain Audit", chainHealthy, chainHealthy ? "Healthy" : "Broken"],
  ];
  const score = Math.round((readiness.filter((r) => r[1]).length / readiness.length) * 100);

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <section className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
          <Card>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-bold text-cyan-200">Prototype Testnet</span>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">AI Security Layer</span>
              <span className="rounded-full bg-violet-400/15 px-3 py-1 text-xs font-bold text-violet-200">Currency Network</span>
            </div>
            <h1 className="text-4xl font-black md:text-6xl">
              Webnett Network
              <span className="block bg-gradient-to-r from-cyan-300 via-emerald-300 to-violet-300 bg-clip-text text-transparent">
                A new trust-first currency era.
              </span>
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
              Demo wallets, WBN transfers, mining, explorer receipts, validator staking, governance voting, and reward pools. Prototype only â€” not a live financial asset.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {[
                ["Wallets", "Create wallets and track balances."],
                ["Transfers", "Send WBN and mine blocks."],
                ["Validators", "Stake WBN and claim rewards."],
                ["Governance", "Vote with validator power."],
              ].map(([a, b]) => (
                <div key={a} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-bold text-cyan-200">{a}</p>
                  <p className="mt-2 text-sm text-slate-400">{b}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Btn onClick={createWallet}><Wallet className="mr-2 inline h-5 w-5" />Create Wallet</Btn>
              <Btn onClick={mineBlock} variant="dark"><Pickaxe className="mr-2 inline h-5 w-5" />Mine Block</Btn>
              <Btn onClick={validateChain} variant="dark"><Shield className="mr-2 inline h-5 w-5" />Validate Chain</Btn>
            </div>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-2xl font-bold"><Database className="text-cyan-200" /> Node Status</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between rounded-2xl bg-black/25 p-3"><span>Network</span><span className="text-emerald-300">Online</span></div>
              <div className="flex justify-between rounded-2xl bg-black/25 p-3"><span>Consensus</span><span>Demo PoW</span></div>
              <div className="flex justify-between rounded-2xl bg-black/25 p-3"><span>Reward</span><span>{BLOCK_REWARD} {SYMBOL}</span></div>
              <div className="flex justify-between rounded-2xl bg-black/25 p-3"><span>Max Supply</span><span>{MAX_SUPPLY.toLocaleString()} {SYMBOL}</span></div>
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-6">
          {statCards.map(([label, value, Icon]: any) => (
            <Card key={label} className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3"><Icon className="h-5 w-5 text-cyan-200" /></div>
                <div>
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="font-black">{value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-emerald-400/20 bg-emerald-400/10">
          <h2 className="mb-4 text-2xl font-black">Simple Test Path</h2>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["Create wallet", userWallets.length > 0, "Generate your first wallet."],
              ["Fund wallet", rawBalance > 0, "Add test WBN."],
              ["Send coins", userTransfers.length > 0, "Send WBN and mine."],
              ["Secure network", validators.length > 0, "Stake as validator."],
            ].map(([a, done, b]: any, i) => (
              <div key={a} className={`rounded-2xl border p-4 ${done ? "border-emerald-300 bg-emerald-300/10" : "border-white/10 bg-black/20"}`}>
                <p className="flex items-center gap-2 font-bold">{done ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <span>{i + 1}</span>} {a}</p>
                <p className="mt-2 text-sm text-slate-300">{b}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-2 md:grid-cols-7">
          {tabs.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`rounded-xl px-3 py-3 text-sm font-bold ${tab === value ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "wallet" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold"><Wallet className="text-cyan-200" /> Create & Fund</h2>
              <InputBox value={walletName} onChange={(e: any) => setWalletName(e.target.value)} placeholder="Wallet name" />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Btn onClick={createWallet}>Generate Wallet</Btn>
                <Btn onClick={() => faucet(selectedWallet)} variant="green">Add +500 WBN</Btn>
              </div>
              <div className="mt-4 rounded-2xl bg-black/25 p-4 text-sm">
                <p>Selected: <b>{selectedWallet?.label}</b></p>
                <p>Spendable: <b className="text-emerald-300">{fmt(spendable)} {SYMBOL}</b></p>
                <p>Locked stake: <b className="text-cyan-200">{fmt(selectedStake)} {SYMBOL}</b></p>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-2xl font-bold">Your Wallets</h2>
              {userWallets.length === 0 && <p className="rounded-2xl bg-black/25 p-4 text-slate-300">No wallets yet.</p>}
              <div className="grid gap-3">
                {userWallets.map((w: any) => (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWalletId(w.id)}
                    className={`cursor-pointer rounded-2xl border p-4 ${selectedWallet?.id === w.id ? "border-cyan-300 bg-cyan-300/10" : "border-white/10 bg-black/20"}`}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-bold">{w.label}</p>
                        <p className="break-all text-sm text-slate-400">{w.address}</p>
                      </div>
                      <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-bold text-emerald-200">{fmt(bal[w.address] || 0)} {SYMBOL}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Btn onClick={(e: any) => { e.stopPropagation(); faucet(w); }} variant="green">Add +500</Btn>
                      <Btn onClick={(e: any) => { e.stopPropagation(); setRecipient(w.address); setTab("send"); }} variant="dark">Use Recipient</Btn>
                      <Btn onClick={(e: any) => { e.stopPropagation(); setRecipient(w.address); setAmount("25"); setTab("send"); }} variant="purple">Quick Send 25</Btn>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === "send" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold"><Send className="text-cyan-200" /> Send Lab</h2>
              <div className="mb-4 rounded-2xl bg-black/25 p-4 text-sm">
                <p>From: <b>{selectedWallet?.label}</b></p>
                <p className="break-all text-slate-400">{selectedWallet?.address}</p>
                <p className="mt-2 text-emerald-300">Spendable: {fmt(spendable)} {SYMBOL}</p>
              </div>
              <InputBox value={recipient} onChange={(e: any) => setRecipient(e.target.value)} placeholder="Recipient address" />
              <InputBox value={amount} onChange={(e: any) => setAmount(e.target.value)} placeholder="Amount" type="number" className="mt-3" />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Btn onClick={queueTransfer}>Queue Transfer</Btn>
                <Btn onClick={mineBlock} variant="dark">Confirm / Mine</Btn>
              </div>
              <div className="mt-5 rounded-2xl bg-black/25 p-4">
                <p className="mb-3 font-bold">Pick recipient wallet</p>
                <div className="space-y-2">
                  {userWallets.filter((w: any) => w.address !== selectedWallet?.address).map((w: any) => (
                    <button key={w.id} onClick={() => setRecipient(w.address)} className="flex w-full justify-between rounded-xl bg-white/5 p-3 text-left hover:bg-white/10">
                      <span>{w.label}</span><span className="text-slate-400">{short(w.address)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold"><SearchCheck className="text-emerald-200" /> Audit Console</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-black/25 p-4"><b>{pending.length}</b><br/><span className="text-slate-400">Pending transfers</span></div>
                <div className="rounded-2xl bg-black/25 p-4"><b>{chainHealthy ? "Passed" : "Failed"}</b><br/><span className="text-slate-400">Chain audit</span></div>
              </div>
              {pending.length > 0 && <div className="mt-4 rounded-2xl bg-yellow-300/10 p-4 text-yellow-100"><AlertTriangle className="mr-2 inline h-5 w-5" />Click Confirm / Mine.</div>}
              <h3 className="mb-3 mt-5 flex items-center gap-2 text-lg font-bold"><Lock className="text-emerald-200" /> Event Log</h3>
              <div className="space-y-2">{logs.map((l, i) => <div key={i} className="rounded-2xl bg-black/25 p-3 text-sm text-slate-300">{l}</div>)}</div>
            </Card>
          </div>
        )}

        {tab === "explorer" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold"><Database className="text-cyan-200" /> Pending Pool</h2>
              {pending.length === 0 ? <p className="text-slate-400">No pending transactions.</p> : pending.map((tx: any) => (
                <div key={tx.id} className="mb-3 rounded-2xl bg-black/25 p-3 text-sm">
                  <p className="font-bold">{fmt(tx.amount)} {SYMBOL}</p>
                  <p className="break-all text-slate-400">From: {tx.from}</p>
                  <p className="break-all text-slate-400">To: {tx.to}</p>
                </div>
              ))}
            </Card>

            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold"><Blocks className="text-violet-200" /> Explorer</h2>
              <div className="mb-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-black/25 p-4"><b>{chainHealthy ? "Healthy" : "Broken"}</b><br/><span className="text-slate-400">Chain</span></div>
                <div className="rounded-2xl bg-black/25 p-4"><b>{short(latest?.hash)}</b><br/><span className="text-slate-400">Latest hash</span></div>
                <div className="rounded-2xl bg-black/25 p-4"><b>{userTransfers.length}</b><br/><span className="text-slate-400">User transfers</span></div>
              </div>

              <div className="mb-5 rounded-2xl bg-black/25 p-4">
                <h3 className="mb-3 text-lg font-bold">Transaction Receipt</h3>
                {selectedReceipt ? (
                  <div className="rounded-2xl bg-emerald-300/10 p-4 text-sm">
                    <p><b>{fmt(selectedReceipt.amount)} {SYMBOL}</b> â€” Confirmed</p>
                    <p>Block: #{selectedReceipt.blockIndex}</p>
                    <p>Type: {selectedReceipt.note}</p>
                    <p className="break-all">From: {selectedReceipt.from}</p>
                    <p className="break-all">To: {selectedReceipt.to}</p>
                  </div>
                ) : <p className="text-slate-400">Click a transaction below.</p>}
              </div>

              <div className="mb-5 rounded-2xl bg-black/25 p-4">
                <h3 className="mb-3 text-lg font-bold">Transaction History</h3>
                <div className="max-h-72 space-y-2 overflow-auto">
                  {txs.map((tx: any) => (
                    <button key={`${tx.blockHash}-${tx.id}`} onClick={() => setSelectedReceipt(tx)} className="w-full rounded-xl bg-white/5 p-3 text-left text-sm hover:bg-white/10">
                      <p><b>{fmt(tx.amount)} {SYMBOL}</b> Â· Block #{tx.blockIndex}</p>
                      <p className="break-all text-slate-400">To: {tx.to}</p>
                      <p className="text-slate-500">{tx.note}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {[...chain].reverse().map((b: any) => (
                  <div key={b.hash} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="font-bold">Block #{b.index}</p>
                    <p className="break-all text-sm text-slate-400">Hash: {b.hash}</p>
                    <p className="text-sm text-slate-500">{(b.transactions || []).length} transaction(s)</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === "validators" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold"><Shield className="text-cyan-200" /> Validator Staking</h2>
              <div className="mb-4 rounded-2xl bg-black/25 p-4 text-sm">
                <p>Selected: <b>{selectedWallet?.label}</b></p>
                <p>Spendable: <span className="text-emerald-300">{fmt(spendable)} {SYMBOL}</span></p>
                <p>Locked stake: <span className="text-cyan-300">{fmt(selectedStake)} {SYMBOL}</span></p>
                <p>Claimable: <span className="text-violet-300">{fmt(rewardShare)} {SYMBOL}</span></p>
                <p>Voting power: <span className="text-cyan-300">{fmt(votingPower)}%</span></p>
              </div>
              <InputBox value={stakeAmount} onChange={(e: any) => setStakeAmount(e.target.value)} type="number" placeholder="Stake amount" />
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Btn onClick={stake}>Stake</Btn>
                <Btn onClick={claimRewards} variant="purple">Claim Rewards</Btn>
                <Btn onClick={unstake} variant="dark">Unstake</Btn>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-black/25 p-4"><b>{validators.length}</b><br/><span className="text-slate-400">Validators</span></div>
                <div className="rounded-2xl bg-black/25 p-4"><b>{fmt(totalStaked)} {SYMBOL}</b><br/><span className="text-slate-400">Total staked</span></div>
                <div className="rounded-2xl bg-black/25 p-4"><b>{fmt(rewardPool)} {SYMBOL}</b><br/><span className="text-slate-400">Reward pool</span></div>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold"><Vote className="text-emerald-200" /> Validator Set</h2>
              {validators.length === 0 ? <p className="rounded-2xl bg-black/25 p-4 text-slate-300">No validators yet.</p> : validators.map((v: any) => {
                const power = totalStaked > 0 ? (v.stake / totalStaked) * 100 : 0;
                return (
                  <div key={v.id} className="mb-3 rounded-2xl bg-black/25 p-4">
                    <p className="font-bold">{v.label}</p>
                    <p className="break-all text-sm text-slate-400">{v.address}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl bg-white/5 p-3"><b>{fmt(v.stake)} {SYMBOL}</b><br/><span className="text-slate-400">Stake</span></div>
                      <div className="rounded-xl bg-white/5 p-3"><b>{fmt(power)}%</b><br/><span className="text-slate-400">Power</span></div>
                      <div className="rounded-xl bg-white/5 p-3"><b>{v.status}</b><br/><span className="text-slate-400">Status</span></div>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {tab === "governance" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold"><Vote className="text-cyan-200" /> Governance</h2>
              <InputBox value={proposalTitle} onChange={(e: any) => setProposalTitle(e.target.value)} placeholder="Proposal title" />
              <textarea value={proposalDesc} onChange={(e: any) => setProposalDesc(e.target.value)} placeholder="Proposal description" className="mt-3 min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-white placeholder:text-slate-500" />
              <div className="mt-3"><Btn onClick={createProposal}>Create Proposal</Btn></div>
            </Card>

            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold"><SearchCheck className="text-emerald-200" /> Proposal Board</h2>
              <div className="space-y-4">
                {proposals.map((p: any) => {
                  const votes = Object.values(p.votes || {}) as any[];
                  const yes = votes.filter((v) => v.choice === "yes").reduce((s, v) => s + v.stake, 0);
                  const no = votes.filter((v) => v.choice === "no").reduce((s, v) => s + v.stake, 0);
                  return (
                    <div key={p.id} className="rounded-2xl bg-black/25 p-4">
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-bold">{p.title}</p>
                          <p className="text-sm text-slate-400">{p.description}</p>
                        </div>
                        <span className="h-fit rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-bold text-emerald-200">{p.status}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">Yes: {fmt(yes)} {SYMBOL} Â· No: {fmt(no)} {SYMBOL}</p>
                      <div className="mt-3 flex gap-2">
                        <Btn onClick={() => vote(p.id, "yes")} disabled={p.status !== "Open"} variant="green">Vote Yes</Btn>
                        <Btn onClick={() => vote(p.id, "no")} disabled={p.status !== "Open"} variant="dark">Vote No</Btn>
                        <Btn onClick={() => closeProposal(p.id)} disabled={p.status !== "Open"} variant="danger">Close</Btn>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {tab === "launch" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h2 className="mb-4 flex items-center gap-2 text-3xl font-black"><Rocket className="text-cyan-200" /> Launch Center</h2>
              <p className="text-lg leading-8 text-slate-300">Webnett is a local prototype with wallets, transfers, mining, validators, governance, and rewards.</p>
              <div className="mt-6 rounded-2xl bg-black/25 p-5">
                <div className="flex justify-between"><h3 className="font-bold"><Target className="mr-2 inline h-5 w-5 text-emerald-200" />Testnet Readiness</h3><b>{score}%</b></div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-3 bg-emerald-400" style={{ width: `${score}%` }} /></div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {readiness.map(([a, ready, detail]: any) => (
                    <div key={a} className={`rounded-2xl p-4 ${ready ? "bg-emerald-300/10" : "bg-yellow-300/10"}`}>
                      <p className="font-bold">{ready ? <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-300" /> : <AlertTriangle className="mr-2 inline h-4 w-4 text-yellow-300" />}{a}</p>
                      <p className="text-sm text-slate-300">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold"><Sparkles className="text-emerald-200" /> Public Demo Copy</h2>
              <p className="rounded-2xl bg-black/25 p-4 text-sm leading-6 text-slate-300">Webnett Network is a trust-first digital currency experiment with demo wallets, mining, validator staking, governance voting, reward pools, and transparent explorer activity.</p>
              <div className="mt-4 space-y-2 text-sm">
                <p><b>Name:</b> Webnett</p>
                <p><b>Symbol:</b> {SYMBOL}</p>
                <p><b>Max Supply:</b> {MAX_SUPPLY.toLocaleString()}</p>
                <p><b>Block Reward:</b> {BLOCK_REWARD} {SYMBOL}</p>
              </div>
            </Card>
          </div>
        )}

        {tab === "advanced" && (
          <Card className="mt-6">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold"><Database className="text-cyan-200" /> Advanced</h2>
            <div className="flex flex-wrap gap-3">
              <Btn onClick={reset} variant="danger">Reset Network</Btn>
              <Btn onClick={() => log("Autosave is active in localStorage.")} variant="dark">Check Autosave</Btn>
            </div>
          </Card>
        )}
      </section>
    </main>
  );
}

