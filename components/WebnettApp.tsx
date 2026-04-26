// @ts-nocheck
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Blocks,
  CheckCircle2,
  Coins,
  Copy,
  Database,
  ExternalLink,
  Gift,
  Lock,
  Pickaxe,
  ReceiptText,
  Rocket,
  SearchCheck,
  Send,
  Settings,
  Shield,
  Sparkles,
  Target,
  Trash2,
  UserCog,
  Vote,
  Wallet,
  Users,
} from "lucide-react";
import { SYMBOL, BLOCK_REWARD, MAX_SUPPLY, fmt, short, hash, genesisBlock, balances, validateChainIntegrity } from "@/lib/chain";
import { id, wallet, cryptoWallet } from "@/lib/wallet";
import { fresh } from "@/lib/network";
import { STORAGE_KEY, loadNodeState, saveNodeState, clearNodeState, createExportPackage, parseImportPackage } from "@/lib/storage";
import { getTotalStaked, getSelectedValidator, getSelectedStake, getSpendableBalance, getVotingPower, getRewardShare, getSpendableBalances } from "@/lib/validators";
import { getOpenProposalCount, getProposalVoteStats, buildProposal } from "@/lib/governance";
import { createUserTransfer, signUserTransfer, verifyUserTransfer, createFaucetTransaction, createRewardTransaction } from "@/lib/transactions";
import { createBlock, createMinedBlock } from "@/lib/blocks";
import { scoreTransactionRisk } from "@/lib/aiRisk";
import { buildNetworkGraph } from "@/lib/networkGraph";
import { buildCurrencyAnalytics } from "@/lib/currencyAnalytics";
import { AI_FEEDBACK_TASKS, AI_MISSIONS, BONUS_PROMPTS, LEARNING_TASKS, getDailyMissions, pickBonusPrompt, scoreEarnTaskInput } from "@/lib/aiTasks";
import { EARNING_IDEA_CATEGORIES, EARNING_IDEAS } from "@/lib/earningIdeas";
import {
  EARN_DAILY_CAP,
  EARN_RULES,
  EARN_TRUST_RULES,
  INTERACTION_MINING_PRINCIPLES,
  DAILY_REWARD_ACTIONS,
  COMMUNITY_REWARD_ACTIONS,
  NETWORK_REWARD_ACTIONS,
  REWARD_LANE_LABELS,
  calculateRewardPayout,
  canAwardReward,
  createEarnProfile,
  createRewardLedgerEntry,
  getClaimableRewards,
  getEarnedToday,
  markLedgerClaimed,
  updateProfileForClaim,
  updateProfileForEarn,
} from "@/lib/rewards";
import { reviewAiMissionWithSkynet } from "@/lib/skynetBridge";
import { createUserProfile, createUserSettings, normalizeHandle } from "@/lib/account";

const SKYNET_CHAT_URL =
  process.env.NEXT_PUBLIC_SKYNET_CHAT_URL ||
  "http://192.168.40.185:4020/chat?sandbox=touring_autonomy_lab";


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

function Badge({ children, className = "" }: any) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

function InputBox(props: any) {
  return <input {...props} className={`w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-slate-500 ${props.className || ""}`} />;
}

export default function WebnettApp() {
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
  const [userProfile, setUserProfile] = useState(() => createUserProfile());
  const [userSettings, setUserSettings] = useState(() => createUserSettings());
  const [inviteInput, setInviteInput] = useState("");
  const [earnProfile, setEarnProfile] = useState(() => createEarnProfile());
  const [earnLedger, setEarnLedger] = useState([]);
  const [dailyMissions, setDailyMissions] = useState(() => getDailyMissions());
  const [selectedMissionId, setSelectedMissionId] = useState("ai-deep-question");
  const [aiTaskInput, setAiTaskInput] = useState("");
  const [aiTaskResult, setAiTaskResult] = useState(null);
  const [selectedFeedbackTaskId, setSelectedFeedbackTaskId] = useState("feedback-latency-report");
  const [feedbackTaskInput, setFeedbackTaskInput] = useState("");
  const [feedbackTaskResult, setFeedbackTaskResult] = useState(null);
  const [selectedLearningTaskId, setSelectedLearningTaskId] = useState("learning-teach-back");
  const [learningTaskInput, setLearningTaskInput] = useState("");
  const [learningTaskResult, setLearningTaskResult] = useState(null);
  const [selectedBonusPromptId, setSelectedBonusPromptId] = useState("bonus-prompt-rescue");
  const [bonusPromptInput, setBonusPromptInput] = useState("");
  const [bonusPromptResult, setBonusPromptResult] = useState(null);
  const [bonusPromptTrigger, setBonusPromptTrigger] = useState("manual");
  const [lastEngagementAt, setLastEngagementAt] = useState(() => Date.now());
  const [skynetStatus, setSkynetStatus] = useState({
    ok: false,
    status: "checking",
    backendReady: false,
    releaseLabel: "Turning model-v1",
    activeAgents: [],
    agentMode: "",
    lastLatencySeconds: null,
  });
  const [skynetClaimInbox, setSkynetClaimInbox] = useState({
    ok: false,
    status: "checking",
    generatedAt: null,
    pendingCount: 0,
    pendingTotal: 0,
    claims: [],
    error: "",
  });
  const [skynetClaimActionId, setSkynetClaimActionId] = useState("");
  const hiddenAtRef = useRef<number | null>(null);

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
        setUserProfile(p.userProfile || createUserProfile(p.selectedWalletId || ""));
        setUserSettings({ ...createUserSettings(), ...(p.userSettings || {}) });
        setEarnProfile(p.earnProfile || createEarnProfile());
        setEarnLedger(p.earnLedger || []);
        setDailyMissions(p.dailyMissions?.length ? p.dailyMissions : getDailyMissions());
        setSelectedMissionId(p.selectedMissionId || "ai-deep-question");
        setAiTaskResult(p.aiTaskResult || null);
        setSelectedFeedbackTaskId(p.selectedFeedbackTaskId || "feedback-latency-report");
        setFeedbackTaskResult(p.feedbackTaskResult || null);
        setSelectedLearningTaskId(p.selectedLearningTaskId || "learning-teach-back");
        setLearningTaskResult(p.learningTaskResult || null);
        setSelectedBonusPromptId(p.selectedBonusPromptId || "bonus-prompt-rescue");
        setBonusPromptResult(p.bonusPromptResult || null);
        setBonusPromptTrigger(p.bonusPromptTrigger || "manual");
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          chain,
          wallets,
          pending,
          logs,
          validators,
          rewardPool,
          proposals,
          selectedWalletId,
          userProfile,
          userSettings,
          earnProfile,
          earnLedger,
          dailyMissions,
          selectedMissionId,
          aiTaskResult,
          selectedFeedbackTaskId,
          feedbackTaskResult,
          selectedLearningTaskId,
          learningTaskResult,
          selectedBonusPromptId,
          bonusPromptResult,
          bonusPromptTrigger,
        })
      );
    } catch {}
  }, [chain, wallets, pending, logs, validators, rewardPool, proposals, selectedWalletId, userProfile, userSettings, earnProfile, earnLedger, dailyMissions, selectedMissionId, aiTaskResult, selectedFeedbackTaskId, feedbackTaskResult, selectedLearningTaskId, learningTaskResult, selectedBonusPromptId, bonusPromptResult, bonusPromptTrigger]);

  useEffect(() => {
    let alive = true;

    async function refreshSkynetStatus() {
      try {
        const response = await fetch("/api/skynet/status", { cache: "no-store" });
        const payload = await response.json();
        if (alive) {
          setSkynetStatus({
            ok: Boolean(payload?.ok),
            status: payload?.status || "offline",
            backendReady: Boolean(payload?.backendReady),
            releaseLabel: payload?.releaseLabel || "Turning model-v1",
            activeAgents: payload?.activeAgents || [],
            agentMode: payload?.agentMode || "",
            lastLatencySeconds: payload?.lastLatencySeconds ?? null,
          });
        }
      } catch {
        if (alive) {
          setSkynetStatus((current: any) => ({ ...current, ok: false, status: "offline", backendReady: false }));
        }
      }
    }

    refreshSkynetStatus();
    const timer = setInterval(refreshSkynetStatus, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function refreshSkynetClaims() {
      try {
        const response = await fetch("/api/skynet/claims", { cache: "no-store" });
        const payload = await response.json();
        if (alive) {
          setSkynetClaimInbox({
            ok: Boolean(payload?.ok && response.ok),
            status: payload?.status || "offline",
            generatedAt: payload?.generatedAt || null,
            pendingCount: Number(payload?.pendingCount || 0),
            pendingTotal: Number(payload?.pendingTotal || 0),
            claims: Array.isArray(payload?.claims) ? payload.claims : [],
            error: String(payload?.error || ""),
          });
        }
      } catch {
        if (alive) {
          setSkynetClaimInbox({
            ok: false,
            status: "offline",
            generatedAt: null,
            pendingCount: 0,
            pendingTotal: 0,
            claims: [],
            error: "Skynet claim inbox unavailable.",
          });
        }
      }
    }

    refreshSkynetClaims();
    const timer = setInterval(refreshSkynetClaims, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const bal = useMemo(() => balances(chain, pending), [chain, pending]);
  const networkGraph = useMemo(() => buildNetworkGraph({ wallets, validators, pending, chain }), [wallets, validators, pending, chain]);
  const currencyAnalytics = useMemo(() => buildCurrencyAnalytics({ chain, pending, balances: bal, validators, rewardPool }), [chain, pending, bal, validators, rewardPool]);
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
  const selectedValidator = getSelectedValidator(validators, selectedWallet);
  const selectedStake = getSelectedStake(selectedValidator);
  const rawBalance = bal[selectedWallet?.address] || 0;
  const spendable = getSpendableBalance(rawBalance, selectedStake);
  const totalStaked = getTotalStaked(validators);
  const votingPower = getVotingPower(totalStaked, selectedValidator);
  const rewardShare = getRewardShare(totalStaked, selectedValidator, rewardPool);
  const chainHealthy = chain.every((b: any, i: number) => i === 0 || b.previousHash === chain[i - 1].hash);
  const latest = chain[chain.length - 1];
  const selectedMission = dailyMissions.find((mission: any) => mission.id === selectedMissionId) || dailyMissions[0] || AI_MISSIONS[0];
  const selectedFeedbackTask = AI_FEEDBACK_TASKS.find((task: any) => task.id === selectedFeedbackTaskId) || AI_FEEDBACK_TASKS[0];
  const selectedLearningTask = LEARNING_TASKS.find((task: any) => task.id === selectedLearningTaskId) || LEARNING_TASKS[0];
  const selectedBonusPrompt = BONUS_PROMPTS.find((task: any) => task.id === selectedBonusPromptId) || BONUS_PROMPTS[0];
  const claimableRewards = useMemo(() => getClaimableRewards(earnLedger), [earnLedger]);
  const earnedToday = useMemo(() => getEarnedToday(earnLedger), [earnLedger]);
  const completedToday = useMemo(
    () => earnLedger.filter((entry: any) => String(entry.createdAt || "").startsWith(new Date().toISOString().slice(0, 10))).length,
    [earnLedger]
  );
  const dailyCapRemaining = Math.max(0, EARN_DAILY_CAP - earnedToday);
  const earnEnabled = userSettings.earnProgramEnabled !== false;
  const inviteLink = typeof window === "undefined"
    ? ""
    : `${window.location.origin}?invite=${encodeURIComponent(userProfile.inviteCode || "")}`;
  const accountReady = Boolean(userProfile.displayName && userProfile.handle);
  const earnBalanceLabel = earnEnabled ? "Earning enabled" : "Earning paused";
  const interactionPower = Math.min(
    100,
    Math.round(
      (completedToday * 12) +
      (earnProfile.streak * 4) +
      (skynetStatus.backendReady ? 18 : 0) +
      (claimableRewards > 0 ? 10 : 0)
    )
  );
  const claimableLedgerCount = earnLedger.filter((entry: any) => entry.status === "claimable").length;
  const aiMissionScore = scoreEarnTaskInput(aiTaskInput, selectedMission);
  const aiMissionPreview = calculateRewardPayout({
    mission: selectedMission,
    qualityScore: aiMissionScore.qualityScore,
    profile: earnProfile,
    lane: "ai_mission",
  });
  const feedbackScore = scoreEarnTaskInput(feedbackTaskInput, selectedFeedbackTask);
  const feedbackPreview = calculateRewardPayout({
    mission: selectedFeedbackTask,
    qualityScore: feedbackScore.qualityScore,
    profile: earnProfile,
    lane: "model_feedback",
  });
  const learningScore = scoreEarnTaskInput(learningTaskInput, selectedLearningTask);
  const learningPreview = calculateRewardPayout({
    mission: selectedLearningTask,
    qualityScore: learningScore.qualityScore,
    profile: earnProfile,
    lane: "learning",
  });
  const bonusScore = scoreEarnTaskInput(bonusPromptInput, selectedBonusPrompt);
  const bonusPreview = calculateRewardPayout({
    mission: selectedBonusPrompt,
    qualityScore: bonusScore.qualityScore,
    profile: earnProfile,
    lane: "bonus_prompt",
  });
  const pendingSkynetClaims = useMemo(
    () => (Array.isArray(skynetClaimInbox.claims) ? skynetClaimInbox.claims.filter((claim: any) => claim.status === "pending") : []),
    [skynetClaimInbox.claims]
  );
  const recentSkynetClaims = useMemo(
    () => (Array.isArray(skynetClaimInbox.claims) ? skynetClaimInbox.claims.slice(0, 5) : []),
    [skynetClaimInbox.claims]
  );
  const skynetPendingWbn = Number(skynetClaimInbox.pendingTotal || 0);

  useEffect(() => {
    const markEngaged = () => setLastEngagementAt(Date.now());
    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenFor = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;
      markEngaged();

      if (hiddenFor >= 45000) {
        const prompt = pickBonusPrompt({ ledger: earnLedger, avoidId: selectedBonusPromptId });
        if (prompt) {
          setSelectedBonusPromptId(prompt.id);
          setBonusPromptResult(null);
          setBonusPromptInput("");
          setBonusPromptTrigger("welcome-back");
          log(`Skynet surfaced a welcome-back bonus: ${prompt.title}.`);
        }
      }
    };

    window.addEventListener("pointerdown", markEngaged, true);
    window.addEventListener("keydown", markEngaged, true);
    window.addEventListener("scroll", markEngaged, true);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pointerdown", markEngaged, true);
      window.removeEventListener("keydown", markEngaged, true);
      window.removeEventListener("scroll", markEngaged, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [earnLedger, selectedBonusPromptId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      if (!earnEnabled) return;
      if (bonusPromptTrigger === "slowdown") return;
      const idleMs = Date.now() - lastEngagementAt;
      if (idleMs < 90000) return;

      const prompt = pickBonusPrompt({ ledger: earnLedger, avoidId: selectedBonusPromptId });
      if (!prompt) return;

      setSelectedBonusPromptId(prompt.id);
      setBonusPromptResult(null);
      setBonusPromptInput("");
      setBonusPromptTrigger("slowdown");
      setLastEngagementAt(Date.now());
      log(`Skynet surfaced a bonus mission because activity slowed: ${prompt.title}.`);
    }, 45000);

    return () => clearInterval(timer);
  }, [earnEnabled, bonusPromptTrigger, earnLedger, lastEngagementAt, selectedBonusPromptId]);

  function log(m: string) {
    setLogs((p: string[]) => [m, ...p].slice(0, 9));
  }

  function earnedMissionToday(missionId: string) {
    const key = new Date().toISOString().slice(0, 10);
    return earnLedger.some((entry: any) => entry.missionId === missionId && String(entry.createdAt || "").startsWith(key));
  }

  function inferRewardLane(missionId = "") {
    if (missionId.startsWith("daily-")) return "daily";
    if (missionId.startsWith("community-")) return "community";
    if (missionId.startsWith("network-")) return "network";
    if (missionId.startsWith("governance-")) return "governance";
    return "ai_mission";
  }

  function openSkynetConsole() {
    window.open(SKYNET_CHAT_URL, "_blank", "noopener,noreferrer");
    log("Opening linked Skynet console.");
  }

  function updateProfileField(field: string, value: string) {
    setUserProfile((profile: any) => ({
      ...profile,
      [field]: field === "handle" ? normalizeHandle(value) : value,
      lastSeenAt: new Date().toISOString(),
    }));
  }

  function updateSetting(field: string, value: any) {
    setUserSettings((settings: any) => ({ ...settings, [field]: value }));
  }

  async function copyInviteCode() {
    const text = inviteLink || userProfile.inviteCode;
    try {
      await navigator.clipboard.writeText(text);
      log("Invite link copied.");
    } catch {
      log(`Invite code: ${userProfile.inviteCode}`);
    }
  }

  function claimInviteReward() {
    const cleaned = inviteInput.trim().toUpperCase();
    if (!cleaned) return log("Paste a tester invite code first.");
    if (cleaned === String(userProfile.inviteCode || "").toUpperCase()) return log("You cannot claim your own invite code.");
    const claimed = recordEarnEventById("community-invite-tester", "Referral/tester invite reward");
    if (claimed) setInviteInput("");
  }

  async function refreshSkynetStatusNow(options: any = {}) {
    const quiet = Boolean(options?.quiet);
    try {
      const response = await fetch("/api/skynet/status", { cache: "no-store" });
      const payload = await response.json();
      setSkynetStatus({
        ok: Boolean(payload?.ok),
        status: payload?.status || "offline",
        backendReady: Boolean(payload?.backendReady),
        releaseLabel: payload?.releaseLabel || "Turning model-v1",
        activeAgents: payload?.activeAgents || [],
        agentMode: payload?.agentMode || "",
        lastLatencySeconds: payload?.lastLatencySeconds ?? null,
      });
      if (!quiet) log(payload?.backendReady ? "Skynet bridge is live." : "Skynet bridge is not ready.");
    } catch {
      setSkynetStatus((current: any) => ({ ...current, ok: false, status: "offline", backendReady: false }));
      if (!quiet) log("Skynet bridge check failed.");
    }
  }

  async function refreshSkynetClaimInbox(options: any = {}) {
    const quiet = Boolean(options?.quiet);
    try {
      const response = await fetch("/api/skynet/claims", { cache: "no-store" });
      const payload = await response.json();
      const inbox = {
        ok: Boolean(payload?.ok && response.ok),
        status: payload?.status || "offline",
        generatedAt: payload?.generatedAt || null,
        pendingCount: Number(payload?.pendingCount || 0),
        pendingTotal: Number(payload?.pendingTotal || 0),
        claims: Array.isArray(payload?.claims) ? payload.claims : [],
        error: String(payload?.error || ""),
      };
      setSkynetClaimInbox(inbox);
      if (!quiet) {
        log(inbox.ok ? `Skynet claim inbox synced: ${inbox.pendingCount} pending shell claim(s).` : "Skynet claim inbox is not reachable.");
      }
      return inbox;
    } catch {
      const inbox = {
        ok: false,
        status: "offline",
        generatedAt: null,
        pendingCount: 0,
        pendingTotal: 0,
        claims: [],
        error: "Skynet claim inbox unavailable.",
      };
      setSkynetClaimInbox(inbox);
      if (!quiet) log("Skynet claim inbox check failed.");
      return inbox;
    }
  }

  async function refreshSkynetBridgeNow() {
    await Promise.all([
      refreshSkynetStatusNow(),
      refreshSkynetClaimInbox(),
    ]);
  }

  async function settleSkynetClaim(claim: any) {
    if (!claim?.id) return;
    if (!selectedWallet || selectedWallet.address === "GENESIS_RESERVE") {
      log("Select a funded user wallet before settling shell rewards.");
      return;
    }
    if (claim.status !== "pending") {
      log("Only pending shell claims can be settled.");
      return;
    }

    setSkynetClaimActionId(claim.id);

    try {
      const tx = createRewardTransaction(selectedWallet.address, Number(claim.amount || 0), "Skynet shell reward settlement");
      const block = createBlock({ index: chain.length, previousHash: latest.hash, transactions: [tx], nonce: 0 });
      const response = await fetch("/api/skynet/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: claim.id,
          action: "settle",
          walletAddress: selectedWallet.address,
          walletLabel: selectedWallet.label,
          txId: tx.id,
          blockIndex: block.index,
          reviewNote: `Settled to ${selectedWallet.label} through Webnett admin.`,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not settle shell claim.");
      }

      setChain((previous: any[]) => [...previous, block]);
      setSelectedReceipt({ ...tx, blockIndex: block.index, blockHash: block.hash });
      await refreshSkynetClaimInbox({ quiet: true });
      log(`Settled ${fmt(Number(claim.amount || 0))} ${SYMBOL} from the Skynet shell into block #${block.index}.`);
    } catch (error: any) {
      log(`Shell claim settlement failed: ${String(error?.message || error || "Unknown error")}`);
    } finally {
      setSkynetClaimActionId("");
    }
  }

  async function rejectSkynetClaim(claim: any) {
    if (!claim?.id) return;
    if (claim.status !== "pending") {
      log("Only pending shell claims can be rejected.");
      return;
    }

    setSkynetClaimActionId(claim.id);

    try {
      const response = await fetch("/api/skynet/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: claim.id,
          action: "reject",
          reviewNote: "Rejected in Webnett admin review.",
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not reject shell claim.");
      }

      await refreshSkynetClaimInbox({ quiet: true });
      log(`Rejected shell claim ${claim.id}.`);
    } catch (error: any) {
      log(`Shell claim rejection failed: ${String(error?.message || error || "Unknown error")}`);
    } finally {
      setSkynetClaimActionId("");
    }
  }

  function clearActivityLog() {
    setLogs(["Activity log cleared."]);
  }

  function clearRewardLedger() {
    setEarnLedger([]);
    setAiTaskResult(null);
    setFeedbackTaskResult(null);
    setLearningTaskResult(null);
    setBonusPromptResult(null);
    log("Reward ledger cleared.");
  }

  function resetEarnOnly() {
    setEarnProfile(createEarnProfile());
    setEarnLedger([]);
    setDailyMissions(getDailyMissions());
    setAiTaskInput("");
    setAiTaskResult(null);
    setFeedbackTaskInput("");
    setFeedbackTaskResult(null);
    setLearningTaskInput("");
    setLearningTaskResult(null);
    setBonusPromptInput("");
    setBonusPromptResult(null);
    setBonusPromptTrigger("manual");
    log("Earn profile reset.");
  }

  function recordEarnEvent(mission: any, source = "Network contribution reward", quiet = false, walletOverride = selectedWallet) {
    if (!mission) return false;
    if (!earnEnabled) {
      if (!quiet) log("Earn program is paused. AI and network features still work without rewards.");
      return false;
    }
    if (!walletOverride || walletOverride.address === "GENESIS_RESERVE") {
      if (!quiet) log("Create/select a user wallet before earning.");
      return false;
    }

    const award = canAwardReward({
      ledger: earnLedger,
      missionId: mission.id,
      amount: mission.reward,
    });

    if (!award.ok) {
      if (!quiet) log(`Earn reward blocked: ${award.reason}`);
      return false;
    }

    const entry = createRewardLedgerEntry({
      mission,
      amount: mission.reward,
      source,
      lane: inferRewardLane(String(mission?.id || "")),
      bridgeResult: {
        mode: "local-earned-event",
        summary: mission.description || mission.title,
      },
    });

    setEarnLedger((p: any[]) => [entry, ...p]);
    setEarnProfile((profile: any) => updateProfileForEarn(profile, mission.reward));
    if (!quiet) log(`Earned ${fmt(mission.reward)} ${SYMBOL}: ${mission.title}. Claim it to confirm on-chain.`);
    return true;
  }

  function recordEarnEventById(eventId: string, source = "Network contribution reward", quiet = false, walletOverride = selectedWallet) {
    const event = [...DAILY_REWARD_ACTIONS, ...COMMUNITY_REWARD_ACTIONS, ...NETWORK_REWARD_ACTIONS].find((item: any) => item.id === eventId);
    return recordEarnEvent(event, source, quiet, walletOverride);
  }

  async function createWallet() {
    const w = await cryptoWallet(walletName || `Wallet ${userWallets.length + 1}`);
    setWallets((p: any[]) => [...p, w]);
    setSelectedWalletId(w.id);
    setWalletName("");
    log(`New wallet created: ${w.address}`);
    recordEarnEventById("network-create-wallet", "Network activity reward", true, w);
  }

  function faucet(w = selectedWallet) {
    if (!w || w.address === "GENESIS_RESERVE") return log("Create/select a user wallet first.");
    const tx = createFaucetTransaction(w.address);
    const block = createBlock({ index: chain.length, previousHash: latest.hash, transactions: [tx], nonce: 0 });
    setChain((p: any[]) => [...p, block]);
    setSelectedWalletId(w.id);
    log(`Faucet confirmed: 500 ${SYMBOL} added to ${w.label}.`);
  }

  async function queueTransfer() {
    const value = Number(amount);
    const fee = Math.max(0.01, value * 0.0025);
    if (!selectedWallet || selectedWallet.address === "GENESIS_RESERVE") return log("Select a funded user wallet first.");
    if (!recipient.trim()) return log("Recipient address missing.");
    if (!value || value <= 0) return log("Amount must be greater than zero.");
    if (recipient === selectedWallet.address) return log("Cannot send to yourself in this demo.");
    if (spendable < value + fee) return log("Blocked: insufficient spendable balance.");

    const tx = createUserTransfer({
      from: selectedWallet.address,
      to: recipient.trim(),
      amount: value,
      fee,
    });

    const risk = scoreTransactionRisk({
      tx,
      knownAddresses: wallets.map((w: any) => w.address),
      spendable,
    });

    if (!risk.approved) {
      return log(`AI risk engine blocked transfer: ${risk.reasons.join(" ")}`);
    }

    tx.riskScore = risk.level;
    tx.riskReasons = risk.reasons;

    const signedTx = await signUserTransfer(tx, selectedWallet);

    setPending((p: any[]) => [...p, signedTx]);
    setRecipient("");
    setAmount("");
    log(`Queued ${fmt(value)} ${SYMBOL}. Fee: ${fmt(fee)}. Risk: ${tx.riskScore}.`);
    recordEarnEventById("network-queue-transfer", "Network activity reward", true);
  }

  async function mineBlock() {
    if (!selectedWallet || selectedWallet.address === "GENESIS_RESERVE") return log("Select a user wallet first.");
    for (const tx of pending) {
      if (tx.note === "User transfer") {
        if (!tx.payload || !tx.signature || !tx.publicKey) {
          return log(`Mining blocked: transaction ${short(tx.id)} is missing a valid signature package.`);
        }

        const result = await verifyUserTransfer(tx);

        if (!result.ok) {
          return log(`Mining blocked: transaction ${short(tx.id)} ${result.error}.`);
        }
      }
    }

    const feeReward = pending.reduce((s: number, tx: any) => s + (tx.fee || 0), 0);
    const rewardTx = createRewardTransaction(selectedWallet.address, BLOCK_REWARD);
    const block = createMinedBlock({
      index: chain.length,
      previousHash: latest.hash,
      transactions: [...pending, rewardTx],
      difficulty: 1,
    });
    setChain((p: any[]) => [...p, block]);
    setPending([]);
    if (validators.length > 0) {
      setRewardPool((p: number) => p + BLOCK_REWARD + feeReward);
      log(`Block mined. ${fmt(BLOCK_REWARD + feeReward)} ${SYMBOL} added to validator reward pool.`);
    } else {
      log(`Block mined. Reward: ${BLOCK_REWARD} ${SYMBOL}.`);
    }
    recordEarnEventById("network-mine-block", "Network activity reward", true);
  }

  function validateChain() {
    const result = validateChainIntegrity(chain);
    log(result.ok ? "Chain validation passed. Hashes and links are healthy." : result.error);
    if (result.ok) recordEarnEventById("network-validate-chain", "Security reward", true);
    return result.ok;
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
    recordEarnEventById("network-stake-validator", "Validator reward", true);
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
    const block = createBlock({ index: chain.length, previousHash: latest.hash, transactions: [tx], nonce: 0 });
    setChain((p: any[]) => [...p, block]);
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
    recordEarnEventById("governance-create-proposal", "Governance reward", true);
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
    recordEarnEventById("governance-vote-proposal", "Governance reward", true);
  }

  function closeProposal(pid: string) {
    setProposals((p: any[]) => p.map((prop) => (prop.id === pid ? { ...prop, status: "Closed" } : prop)));
    log("Proposal closed.");
  }

  async function completeEarnLaneTask({
    mission,
    input,
    lane,
    source,
    setResult,
    clearInput,
  }: any) {
    if (!earnEnabled) {
      log("Earn program is paused. You can still use Skynet without collecting WBN rewards.");
      return false;
    }
    if (!selectedWallet || selectedWallet.address === "GENESIS_RESERVE") {
      log("Create/select a user wallet before earning.");
      return false;
    }
    if (!mission) {
      log("No earning mission selected.");
      return false;
    }

    const scoring = scoreEarnTaskInput(input, mission);
    if (!scoring.approved) {
      setResult({
        ok: false,
        title: "Submission needs more useful context",
        details: scoring.reasons,
        qualityScore: scoring.qualityScore,
      });
      log(`Earn mission blocked: ${scoring.reasons[0]}`);
      return false;
    }

    const payout = calculateRewardPayout({
      mission,
      qualityScore: scoring.qualityScore,
      profile: earnProfile,
      lane,
    });

    const award = canAwardReward({
      ledger: earnLedger,
      missionId: mission.id,
      amount: payout.finalReward,
    });

    if (!award.ok) {
      setResult({
        ok: false,
        title: "Reward not minted",
        details: [award.reason],
        qualityScore: scoring.qualityScore,
        payoutSummary: payout.summary,
        rewardReason: `Blocked before minting. Proposed payout was ${payout.finalReward} ${SYMBOL}.`,
        laneLabel: REWARD_LANE_LABELS[lane] || "Earn",
      });
      log(`Earn reward blocked: ${award.reason}`);
      return false;
    }

    const bridgeResult = await reviewAiMissionWithSkynet({
      input,
      mission,
      lane,
      payout,
      qualityScore: scoring.qualityScore,
    });
    const entry = createRewardLedgerEntry({
      mission,
      amount: payout.finalReward,
      source,
      bridgeResult,
      payout,
      qualityScore: scoring.qualityScore,
      lane,
    });

    setEarnLedger((p: any[]) => [entry, ...p]);
    setEarnProfile((profile: any) => updateProfileForEarn(profile, payout.finalReward));
    setResult({
      ok: true,
      title: `${payout.finalReward} ${SYMBOL} ready to claim`,
      details: [bridgeResult.response],
      qualityScore: scoring.qualityScore,
      bridgeMode: bridgeResult.mode,
      latencySeconds: bridgeResult.latencySeconds,
      releaseLabel: bridgeResult.releaseLabel,
      entryId: entry.id,
      payoutSummary: payout.summary,
      rewardReason: bridgeResult.rewardReason || `Reward approved through the ${REWARD_LANE_LABELS[lane] || "Earn"} lane.`,
      laneLabel: REWARD_LANE_LABELS[lane] || "Earn",
    });
    clearInput("");
    log(`Earned ${fmt(payout.finalReward)} ${SYMBOL} through ${REWARD_LANE_LABELS[lane] || "Earn"}. Claim it to confirm on-chain.`);
    if (userSettings.autoOpenSkynet) openSkynetConsole();
    return true;
  }

  async function completeAiTask() {
    return completeEarnLaneTask({
      mission: selectedMission,
      input: aiTaskInput,
      lane: "ai_mission",
      source: "AI mission reward",
      setResult: setAiTaskResult,
      clearInput: setAiTaskInput,
    });
  }

  async function completeFeedbackTask() {
    return completeEarnLaneTask({
      mission: selectedFeedbackTask,
      input: feedbackTaskInput,
      lane: "model_feedback",
      source: "Model feedback reward",
      setResult: setFeedbackTaskResult,
      clearInput: setFeedbackTaskInput,
    });
  }

  async function completeLearningTask() {
    return completeEarnLaneTask({
      mission: selectedLearningTask,
      input: learningTaskInput,
      lane: "learning",
      source: "Learning reward",
      setResult: setLearningTaskResult,
      clearInput: setLearningTaskInput,
    });
  }

  async function completeBonusPrompt() {
    const ok = await completeEarnLaneTask({
      mission: selectedBonusPrompt,
      input: bonusPromptInput,
      lane: "bonus_prompt",
      source: "Bonus prompt reward",
      setResult: setBonusPromptResult,
      clearInput: setBonusPromptInput,
    });
    if (ok) setBonusPromptTrigger("completed");
    return ok;
  }

  function spinBonusPrompt(trigger = "manual") {
    const prompt = pickBonusPrompt({ ledger: earnLedger, avoidId: selectedBonusPromptId });
    if (!prompt) return;
    setSelectedBonusPromptId(prompt.id);
    setBonusPromptInput("");
    setBonusPromptResult(null);
    setBonusPromptTrigger(trigger);
    setLastEngagementAt(Date.now());
    log(`New bonus mission loaded: ${prompt.title}.`);
  }

  function claimEarnReward() {
    if (!selectedWallet || selectedWallet.address === "GENESIS_RESERVE") return log("Create/select a user wallet before claiming rewards.");
    if (claimableRewards <= 0) return log("No claimable earn rewards yet.");

    const tx = createRewardTransaction(selectedWallet.address, claimableRewards, "Webnett Earn reward");
    const block = createBlock({ index: chain.length, previousHash: latest.hash, transactions: [tx], nonce: 0 });

    setChain((p: any[]) => [...p, block]);
    setEarnLedger((ledger: any[]) => markLedgerClaimed(ledger, tx.id));
    setEarnProfile((profile: any) => updateProfileForClaim(profile, claimableRewards));
    setSelectedReceipt({ ...tx, blockIndex: block.index, blockHash: block.hash });
    log(`Claimed ${fmt(claimableRewards)} ${SYMBOL} into block #${block.index}.`);
  }

  function resetDailyMissions() {
    setDailyMissions(getDailyMissions());
    setSelectedMissionId("ai-deep-question");
    setAiTaskResult(null);
    setFeedbackTaskResult(null);
    setLearningTaskResult(null);
    setBonusPromptResult(null);
    setBonusPromptTrigger("manual");
    log("Daily AI earning missions refreshed.");
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
    setEarnProfile(createEarnProfile());
    setEarnLedger([]);
    setDailyMissions(getDailyMissions());
    setSelectedMissionId("ai-deep-question");
    setAiTaskInput("");
    setAiTaskResult(null);
    setSelectedFeedbackTaskId("feedback-latency-report");
    setFeedbackTaskInput("");
    setFeedbackTaskResult(null);
    setSelectedLearningTaskId("learning-teach-back");
    setLearningTaskInput("");
    setLearningTaskResult(null);
    setSelectedBonusPromptId("bonus-prompt-rescue");
    setBonusPromptInput("");
    setBonusPromptResult(null);
    setBonusPromptTrigger("manual");
    localStorage.removeItem(STORAGE_KEY);
  }

  function renderEarnTaskResult(result: any) {
    if (!result) return null;

    return (
      <div className={`mt-5 rounded-2xl border p-4 text-sm ${result.ok ? "border-emerald-300/30 bg-emerald-300/10" : "border-yellow-300/30 bg-yellow-300/10"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold">{result.title}</p>
          <div className="flex flex-wrap gap-2">
            {result.laneLabel && <Badge className="bg-cyan-400/15 text-cyan-200">{result.laneLabel}</Badge>}
            {result.bridgeMode && <Badge className="bg-violet-400/15 text-violet-200">{result.bridgeMode}</Badge>}
            {result.latencySeconds && <Badge className="bg-white/10 text-white">{result.latencySeconds}s</Badge>}
            <Badge className="bg-white/10 text-white">Quality {result.qualityScore || 0}</Badge>
          </div>
        </div>
        <div className="mt-2 space-y-1 text-slate-300">
          {(result.details || []).map((detail: string, index: number) => <p key={index}>{detail}</p>)}
        </div>
        {(result.payoutSummary || result.rewardReason) && (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Payout basis</p>
              <p className="mt-2 text-slate-200">{result.payoutSummary || "No payout summary recorded."}</p>
            </div>
            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Reward reason</p>
              <p className="mt-2 text-slate-200">{result.rewardReason || "No reward reason recorded."}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const statCards = [
    ["Blocks", chain.length, Blocks],
    ["Wallets", wallets.length, Wallet],
    ["Pending", pending.length, Activity],
    ["TX History", txs.length, ReceiptText],
    ["Validators", validators.length, Users],
    ["Earn Claimable", `${fmt(claimableRewards)} ${SYMBOL}`, Coins],
  ];

  const tabs = [
    ["wallet", "Wallet"],
    ["send", "Send"],
    ["explorer", "Explorer"],
    ["earn", "Earn"],
    ["profile", "Profile"],
    ["validators", "Validators"],
    ["governance", "Governance"],
    ["settings", "Settings"],
    ["advanced", "Advanced"],
  ];

  const readiness = [
    ["Wallets", userWallets.length >= 2, `${userWallets.length} wallet(s)`],
    ["Account", accountReady, accountReady ? `@${userProfile.handle}` : "Profile needed"],
    ["Transfers", userTransfers.length > 0, `${userTransfers.length} transfer(s)`],
    ["Earn", earnProfile.completedMissions > 0, `${earnProfile.completedMissions} mission(s)`],
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
            <div className="mt-6 grid gap-3 md:grid-cols-5">
              {[
                ["Wallets", "Create wallets and track balances."],
                ["Transfers", "Send WBN and mine blocks."],
                ["Earn", "Complete useful AI missions for demo WBN."],
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
              <Btn onClick={openSkynetConsole} variant="purple"><Sparkles className="mr-2 inline h-5 w-5" />Open Skynet</Btn>
              <Btn onClick={mineBlock} variant="dark"><Pickaxe className="mr-2 inline h-5 w-5" />Mine Block</Btn>
              <Btn onClick={validateChain} variant="dark"><Shield className="mr-2 inline h-5 w-5" />Validate Chain</Btn>
            </div>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-2xl font-bold"><Database className="text-cyan-200" /> Node Status</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between rounded-2xl bg-black/25 p-3"><span>Network</span><span className="text-emerald-300">Online</span></div>
              <div className="flex justify-between rounded-2xl bg-black/25 p-3"><span>Skynet Bridge</span><span className={skynetStatus.backendReady ? "text-emerald-300" : "text-yellow-300"}>{skynetStatus.backendReady ? "Connected" : skynetStatus.status}</span></div>
              <div className="flex justify-between rounded-2xl bg-black/25 p-3"><span>Model Line</span><span>{skynetStatus.releaseLabel}</span></div>
              <div className="flex justify-between rounded-2xl bg-black/25 p-3"><span>Consensus</span><span>Demo PoW</span></div>
              <div className="flex justify-between rounded-2xl bg-black/25 p-3"><span>Reward</span><span>{BLOCK_REWARD} {SYMBOL}</span></div>
              <div className="flex justify-between rounded-2xl bg-black/25 p-3"><span>Max Supply</span><span>{MAX_SUPPLY.toLocaleString()} {SYMBOL}</span></div>
              <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-black/25 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-cyan-200">Live Webnett Market Graph</p>
                    <p className="text-xs text-slate-400">Recent block volume and WBN network movement</p>
                  </div>
                  <Badge className="bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15">Live</Badge>
                </div>
                <div className="relative h-48 overflow-hidden rounded-2xl bg-slate-950/80 p-4">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(to right, rgba(148,163,184,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,.18) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
                  <div className="relative flex h-full items-end gap-2 overflow-x-auto">
                    {currencyAnalytics.blockSeries.slice(-18).map((block: any) => {
                      const maxVolume = Math.max(1, ...currencyAnalytics.blockSeries.map((item: any) => item.volume || 0));
                      const height = Math.max(12, Math.round(((block.volume || 0) / maxVolume) * 135));
                      return (
                        <div key={block.blockIndex} className="flex min-w-8 flex-col items-center justify-end gap-1">
                          <div
                            title={`Block #${block.blockIndex}: ${fmt(block.volume)} ${SYMBOL}`}
                            className="w-6 rounded-t-lg bg-cyan-300/80 shadow-lg shadow-cyan-400/20"
                            style={{ height: `${height}px` }}
                          />
                          <span className="text-[10px] text-slate-500">#{block.blockIndex}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white/5 p-3"><b>{fmt(currencyAnalytics.stats.confirmedUserVolume)} {SYMBOL}</b><br /><span className="text-slate-400">Confirmed volume</span></div>
                  <div className="rounded-xl bg-white/5 p-3"><b>{fmt(currencyAnalytics.stats.pendingVolume)} {SYMBOL}</b><br /><span className="text-slate-400">Pending volume</span></div>
                </div>
              </div>
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

        <Card className="mt-6 border-cyan-300/20 bg-cyan-300/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <Activity className="h-6 w-6 text-cyan-200" /> Live Network & Currency Graph
              </h2>
              <p className="mt-2 text-sm text-slate-400">Always-visible Webnett network activity, WBN volume, and blockchain movement.</p>
            </div>
            <div className="rounded-2xl bg-black/25 px-4 py-3 text-sm">
              <b>{networkGraph.stats.nodeCount}</b> nodes · <b>{networkGraph.stats.linkCount}</b> links
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-black/25 p-4"><b>{fmt(currencyAnalytics.stats.totalWalletBalance)} {SYMBOL}</b><br /><span className="text-slate-400">Wallet Supply</span></div>
            <div className="rounded-2xl bg-black/25 p-4"><b>{fmt(currencyAnalytics.stats.confirmedUserVolume)} {SYMBOL}</b><br /><span className="text-slate-400">Confirmed Volume</span></div>
            <div className="rounded-2xl bg-black/25 p-4"><b>{fmt(currencyAnalytics.stats.pendingVolume)} {SYMBOL}</b><br /><span className="text-slate-400">Pending Volume</span></div>
            <div className="rounded-2xl bg-black/25 p-4"><b>{fmt(currencyAnalytics.stats.rewardPool)} {SYMBOL}</b><br /><span className="text-slate-400">Reward Pool</span></div>
          </div>

          <div className="mt-6 rounded-2xl bg-black/25 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold text-cyan-200">Recent Block Volume</p>
              <p className="text-sm text-slate-400">Blocks · WBN moved · Fees</p>
            </div>
            <div className="flex h-56 items-end gap-2 overflow-x-auto rounded-2xl bg-slate-950/60 p-4">
              {currencyAnalytics.blockSeries.slice(-24).map((block: any) => {
                const maxVolume = Math.max(1, ...currencyAnalytics.blockSeries.map((item: any) => item.volume || 0));
                const height = Math.max(10, Math.round(((block.volume || 0) / maxVolume) * 180));
                return (
                  <div key={block.blockIndex} className="flex min-w-12 flex-col items-center justify-end gap-2">
                    <div
                      title={`Block #${block.blockIndex}: ${fmt(block.volume)} ${SYMBOL}`}
                      className="w-8 rounded-t-xl bg-cyan-300/80 shadow-lg shadow-cyan-500/20"
                      style={{ height: `${height}px` }}
                    />
                    <span className="text-xs text-slate-500">#{block.blockIndex}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-black/25 p-4">
              <p className="mb-3 font-bold text-emerald-200">Top Wallet Balances</p>
              <div className="space-y-2">
                {currencyAnalytics.walletBalances.slice(0, 4).map((item: any) => (
                  <div key={item.address} className="flex flex-wrap justify-between gap-2 rounded-xl bg-white/5 p-3 text-sm">
                    <span>{short(item.address)}</span>
                    <b>{fmt(item.balance)} {SYMBOL}</b>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-black/25 p-4">
              <p className="mb-3 font-bold text-yellow-200">Live Link Status</p>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div className="rounded-xl bg-white/5 p-3"><b>{networkGraph.stats.pendingLinks}</b><br /><span className="text-slate-400">Pending links</span></div>
                <div className="rounded-xl bg-white/5 p-3"><b>{networkGraph.stats.confirmedLinks}</b><br /><span className="text-slate-400">Confirmed links</span></div>
                <div className="rounded-xl bg-white/5 p-3"><b>{fmt(currencyAnalytics.stats.totalStaked)} {SYMBOL}</b><br /><span className="text-slate-400">Validator stake</span></div>
                <div className="rounded-xl bg-white/5 p-3"><b>{currencyAnalytics.stats.blockCount}</b><br /><span className="text-slate-400">Blocks tracked</span></div>
              </div>
            </div>
          </div>
        </Card>
        <Card className="mt-6 border-emerald-400/20 bg-emerald-400/10">
          <h2 className="mb-4 text-2xl font-black">Simple Test Path</h2>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              ["Create wallet", userWallets.length > 0, "Generate your first wallet."],
              ["Fund wallet", rawBalance > 0, "Add test WBN."],
              ["Send coins", userTransfers.length > 0, "Send WBN and mine."],
              ["Earn WBN", earnProfile.completedMissions > 0, "Complete an AI mission."],
              ["Secure network", validators.length > 0, "Stake as validator."],
            ].map(([a, done, b]: any, i) => (
              <div key={a} className={`rounded-2xl border p-4 ${done ? "border-emerald-300 bg-emerald-300/10" : "border-white/10 bg-black/20"}`}>
                <p className="flex items-center gap-2 font-bold">{done ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <span>{i + 1}</span>} {a}</p>
                <p className="mt-2 text-sm text-slate-300">{b}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-2 md:grid-cols-8">
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

        {tab === "earn" && (
          <div className="mt-6 space-y-6">
            <Card className="border-cyan-300/20 bg-cyan-300/10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge className="bg-cyan-400/15 text-cyan-200">Skynet bridge ready</Badge>
                    <Badge className="bg-yellow-400/15 text-yellow-200">Demo/testnet only</Badge>
                    <Badge className={skynetStatus.backendReady ? "bg-emerald-400/15 text-emerald-200" : "bg-slate-400/15 text-slate-300"}>
                      {skynetStatus.backendReady ? "Live Skynet connected" : "Fallback bridge available"}
                    </Badge>
                    <Badge className="bg-blue-400/15 text-blue-200">{skynetClaimInbox.pendingCount} shell claims queued</Badge>
                    <Badge className="bg-emerald-400/15 text-emerald-200">{EARNING_IDEAS.length} earning ideas banked</Badge>
                  </div>
                  <h2 className="flex items-center gap-2 text-3xl font-black">
                    <Sparkles className="h-7 w-7 text-cyan-200" /> Earn Center
                  </h2>
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
                    Complete useful AI missions, collect claimable WBN, then confirm it into a local block. This is a prototype reward loop for testing interaction incentives, not a financial product or exchange token.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Btn onClick={openSkynetConsole} variant="purple">Open Linked Skynet UI</Btn>
                    <span className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-slate-400">
                      Bridge target: {SKYNET_CHAT_URL}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm">
                  <p className="text-slate-400">Selected wallet</p>
                  <p className="font-bold">{selectedWallet?.label || "No wallet selected"}</p>
                  <p className="break-all text-xs text-slate-500">{selectedWallet?.address}</p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-3xl border border-cyan-200/20 bg-slate-950/80 shadow-2xl shadow-cyan-950/30">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">Webnett Earn Balance</p>
                    <p className="mt-1 text-sm text-slate-400">{earnBalanceLabel}. Opt out any time without losing access to Skynet.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSetting("earnProgramEnabled", !earnEnabled)}
                    className={`rounded-2xl px-4 py-2 text-sm font-black transition ${earnEnabled ? "bg-emerald-300 text-slate-950 hover:bg-emerald-200" : "bg-white/10 text-slate-200 hover:bg-white/20"}`}
                  >
                    {earnEnabled ? "Opt Out" : "Opt In"}
                  </button>
                </div>
                <div className="grid gap-0 lg:grid-cols-[1.25fr_.75fr]">
                  <div className="p-6 text-center">
                    <p className="text-5xl font-black tracking-tight text-white md:text-7xl">
                      {fmt(claimableRewards)} <span className="text-cyan-200">{SYMBOL}</span>
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-400">Claimable demo/testnet balance. Approx. USD value: $0.00</p>
                    <div className="mx-auto mt-5 h-14 max-w-md rounded-full bg-black/30 p-2">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${earnEnabled ? "from-cyan-300 via-blue-400 to-emerald-300" : "from-slate-500 to-slate-400"}`}
                        style={{ width: `${Math.max(8, Math.min(100, (claimableRewards / Math.max(1, EARN_DAILY_CAP)) * 100))}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid border-t border-white/10 lg:border-l lg:border-t-0">
                    <div className="grid grid-cols-2 border-b border-white/10">
                      <div className="p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Earned Today</p>
                        <p className="mt-2 text-2xl font-black">{fmt(earnedToday)} {SYMBOL}</p>
                      </div>
                      <div className="p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Total Earned</p>
                        <p className="mt-2 text-2xl font-black">{fmt(earnProfile.totalEarned)} {SYMBOL}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2">
                      <div className="p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Total Claimed</p>
                        <p className="mt-2 text-2xl font-black">{fmt(earnProfile.totalClaimed)} {SYMBOL}</p>
                      </div>
                      <div className="p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Daily Cap</p>
                        <p className="mt-2 text-2xl font-black">{fmt(dailyCapRemaining)} {SYMBOL}</p>
                      </div>
                    </div>
                    <div className="border-t border-white/10 p-5">
                      <Btn onClick={claimEarnReward} disabled={claimableRewards <= 0}>Claim Balance</Btn>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-5">
                <div className="rounded-2xl bg-black/25 p-4"><b>{fmt(claimableRewards)} {SYMBOL}</b><br /><span className="text-slate-400">Claimable</span></div>
                <div className="rounded-2xl bg-black/25 p-4"><b>{fmt(earnedToday)} / {EARN_DAILY_CAP}</b><br /><span className="text-slate-400">Earned today</span></div>
                <div className="rounded-2xl bg-black/25 p-4"><b>{earnProfile.streak}</b><br /><span className="text-slate-400">Day streak</span></div>
                <div className="rounded-2xl bg-black/25 p-4"><b>Level {earnProfile.level}</b><br /><span className="text-slate-400">{earnProfile.xp} XP</span></div>
                <div className="rounded-2xl bg-black/25 p-4"><b>{completedToday}</b><br /><span className="text-slate-400">Missions today</span></div>
              </div>
            </Card>

            <Card className="border-blue-300/20 bg-blue-300/10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge className={skynetClaimInbox.ok ? "bg-emerald-400/15 text-emerald-200" : "bg-slate-400/15 text-slate-300"}>
                      {skynetClaimInbox.ok ? "Claim inbox live" : "Claim inbox offline"}
                    </Badge>
                    <Badge className="bg-cyan-400/15 text-cyan-200">{pendingSkynetClaims.length} pending</Badge>
                    <Badge className="bg-blue-400/15 text-blue-200">{fmt(skynetPendingWbn)} {SYMBOL} queued</Badge>
                  </div>
                  <h3 className="text-3xl font-black">Skynet claim inbox</h3>
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
                    This is the live inbox for rewards queued from the Skynet shell. It lets the Webnett admin side see what the public AI surface has already awarded before those amounts are settled deeper into the system.
                  </p>
                </div>
                <Btn onClick={refreshSkynetClaimInbox} variant="dark">Refresh Inbox</Btn>
              </div>

              <div className="mt-5 grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Pending claims</p>
                    <p className="mt-2 text-2xl font-black">{skynetClaimInbox.pendingCount}</p>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Pending queued WBN</p>
                    <p className="mt-2 text-2xl font-black text-blue-200">{fmt(skynetPendingWbn)} {SYMBOL}</p>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-4 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Last sync</p>
                    <p className="mt-2 text-sm text-slate-300">
                      {skynetClaimInbox.generatedAt ? new Date(skynetClaimInbox.generatedAt).toLocaleString() : skynetClaimInbox.error || "No claim sync yet."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Settlement target</p>
                    <p className="mt-2 font-bold">{selectedWallet?.label || "No wallet selected"}</p>
                    <p className="mt-1 break-all text-xs text-slate-400">{selectedWallet?.address || "Choose a Webnett wallet before settling shell-earned rewards."}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-bold text-blue-200">Recent shell-earned claims</p>
                    <span className="text-sm text-slate-400">Newest first</span>
                  </div>
                  {recentSkynetClaims.length === 0 ? (
                    <p className="rounded-2xl bg-black/25 p-4 text-sm text-slate-400">No queued Skynet claims yet. Earn in the shell and they will appear here automatically.</p>
                  ) : (
                    <div className="space-y-3">
                      {recentSkynetClaims.map((claim: any) => (
                        <div key={claim.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-bold">{fmt(claim.amount)} {SYMBOL}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-blue-200">{claim.rewardReason || "Skynet shell reward"}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge className={claim.status === "pending" ? "bg-yellow-400/15 text-yellow-200" : "bg-emerald-400/15 text-emerald-200"}>{claim.status}</Badge>
                              <Badge className="bg-white/10 text-white">{claim.responseMode || "fast"}</Badge>
                            </div>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-300">{claim.rewardSummary || "Queued from the Skynet shell."}</p>
                          <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-3">
                            <span>Thread: {claim.threadId || "n/a"}</span>
                            <span>Device: {claim.deviceLabel || claim.deviceRole || "console"}</span>
                            <span>{claim.createdAt ? new Date(claim.createdAt).toLocaleString() : "Time unavailable"}</span>
                          </div>
                          {claim.status === "pending" ? (
                            <div className="mt-4 flex flex-wrap gap-3">
                              <Btn
                                onClick={() => settleSkynetClaim(claim)}
                                disabled={skynetClaimActionId === claim.id || !selectedWallet || selectedWallet.address === "GENESIS_RESERVE"}
                                variant="green"
                              >
                                {skynetClaimActionId === claim.id ? "Settling..." : "Settle To Selected Wallet"}
                              </Btn>
                              <Btn
                                onClick={() => rejectSkynetClaim(claim)}
                                disabled={skynetClaimActionId === claim.id}
                                variant="danger"
                              >
                                {skynetClaimActionId === claim.id ? "Working..." : "Reject Claim"}
                              </Btn>
                            </div>
                          ) : (
                            <div className="mt-4 rounded-2xl bg-black/25 p-3 text-sm text-slate-300">
                              {claim.status === "settled" ? (
                                <>
                                  <p><b>Settled:</b> {claim.settledAt ? new Date(claim.settledAt).toLocaleString() : "Recorded"}</p>
                                  <p><b>Wallet:</b> {claim.settledToLabel || claim.settledToWallet || "n/a"}</p>
                                  <p><b>Block:</b> {claim.settledBlockIndex ?? "n/a"} | <b>TX:</b> {claim.settledTxId || "n/a"}</p>
                                </>
                              ) : (
                                <>
                                  <p><b>Rejected:</b> {claim.rejectedAt ? new Date(claim.rejectedAt).toLocaleString() : "Recorded"}</p>
                                  <p><b>Review note:</b> {claim.reviewNote || "No review note."}</p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card className="border-violet-300/20 bg-violet-300/10">
              <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge className="bg-violet-400/15 text-violet-200">AI interaction mining</Badge>
                    <Badge className="bg-cyan-400/15 text-cyan-200">Proof of useful interaction</Badge>
                    {!earnEnabled && <Badge className="bg-slate-400/15 text-slate-300">Rewards paused</Badge>}
                  </div>
                  <h3 className="text-3xl font-black">Earn by using the AI with purpose.</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Inspired by browser reward models, Webnett rewards useful AI work instead of passive page time. The user completes meaningful prompts, Skynet reviews the contribution when connected, and WBN becomes claimable only inside this demo/testnet economy.
                  </p>
                  <div className="mt-5 rounded-2xl bg-black/25 p-5">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm text-slate-400">Interaction power</span>
                      <b>{interactionPower}%</b>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-3 rounded-full bg-gradient-to-r from-cyan-300 via-violet-300 to-emerald-300" style={{ width: `${interactionPower}%` }} />
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <div className="rounded-xl bg-white/5 p-3"><b>{fmt(dailyCapRemaining)} {SYMBOL}</b><br /><span className="text-slate-400">Cap remaining</span></div>
                      <div className="rounded-xl bg-white/5 p-3"><b>{claimableLedgerCount}</b><br /><span className="text-slate-400">Open rewards</span></div>
                      <div className="rounded-xl bg-white/5 p-3"><b>{skynetStatus.backendReady ? "Live" : "Fallback"}</b><br /><span className="text-slate-400">Review mode</span></div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {INTERACTION_MINING_PRINCIPLES.map((principle: any) => (
                    <div key={principle.title} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="font-bold text-cyan-200">{principle.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{principle.description}</p>
                    </div>
                  ))}
                  {EARN_TRUST_RULES.map((rule: string) => (
                    <div key={rule} className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                      <p className="font-bold text-emerald-200">Trust rule</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr_.75fr]">
              <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-2xl font-bold">AI Missions</h3>
                  <Btn onClick={resetDailyMissions} variant="dark">Refresh Daily</Btn>
                </div>
                <div className="space-y-3">
                  {dailyMissions.map((mission: any) => {
                    const paid = earnLedger.some((entry: any) => entry.missionId === mission.id && String(entry.createdAt || "").startsWith(new Date().toISOString().slice(0, 10)));
                    return (
                      <button
                        key={mission.dailyId || mission.id}
                        onClick={() => setSelectedMissionId(mission.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${selectedMission?.id === mission.id ? "border-cyan-300 bg-cyan-300/10" : "border-white/10 bg-black/20 hover:bg-white/10"}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-bold">{mission.title}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-cyan-200">{mission.category}</p>
                          </div>
                          <Badge className={paid ? "bg-slate-400/15 text-slate-300" : "bg-emerald-400/15 text-emerald-200"}>
                            {!earnEnabled ? "Paused" : paid ? "Paid today" : `${mission.reward} ${SYMBOL}`}
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm text-slate-400">{mission.prompt}</p>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-cyan-200">Selected Mission</p>
                    <h3 className="mt-1 text-2xl font-black">{selectedMission?.title}</h3>
                  </div>
                  <Badge className={earnEnabled ? "bg-emerald-400/15 text-emerald-200" : "bg-slate-400/15 text-slate-300"}>{earnEnabled ? `${selectedMission?.reward || 0} ${SYMBOL}` : "Rewards paused"}</Badge>
                </div>
                <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-300">{selectedMission?.prompt}</p>
                <textarea
                  value={aiTaskInput}
                  onChange={(e: any) => setAiTaskInput(e.target.value)}
                  placeholder="Write the useful AI task, research request, feedback report, build plan, or model improvement note here..."
                  className="mt-4 min-h-44 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
                />
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Base Reward</p>
                    <p className="mt-2 text-2xl font-black">{fmt(aiMissionPreview.baseReward)} {SYMBOL}</p>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Potential Payout</p>
                    <p className="mt-2 text-2xl font-black text-cyan-200">{fmt(aiMissionPreview.finalReward)} {SYMBOL}</p>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Quality Score</p>
                    <p className="mt-2 text-2xl font-black">{aiMissionScore.qualityScore}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                  <b className="text-cyan-200">Payout tuning:</b> {aiMissionPreview.summary}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
                  <span>{aiTaskInput.trim().length} / {selectedMission?.minLength || 80} chars minimum</span>
                  <span>Rewards require quality, unique completion, and daily cap room.</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Btn onClick={completeAiTask} disabled={!earnEnabled}>Complete AI Mission</Btn>
                  <Btn onClick={() => { setAiTaskInput(""); setAiTaskResult(null); }} variant="dark">Clear</Btn>
                </div>
                {renderEarnTaskResult(aiTaskResult)}
              </Card>

              <Card>
                <h3 className="text-2xl font-bold">Claim Rewards</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Claiming mints one confirmed reward transaction into the local chain so balances, explorer, analytics, and graph views can see it.
                </p>
                <div className="my-5 rounded-2xl bg-black/25 p-5">
                  <p className="text-sm text-slate-400">Available</p>
                  <p className="text-4xl font-black text-emerald-200">{fmt(claimableRewards)} {SYMBOL}</p>
                </div>
                <Btn onClick={claimEarnReward} disabled={claimableRewards <= 0}>Claim To Chain</Btn>
                {userSettings.showPrototypeNotices && (
                  <div className="mt-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm leading-6 text-yellow-100">
                    <b>Prototype notice:</b> WBN rewards here are demo/testnet currency only. They are not an investment, exchange token, or financial product.
                  </div>
                )}
                <div className="mt-5 space-y-2">
                  {EARN_RULES.map((rule: string) => (
                    <p key={rule} className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{rule}</p>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="border-blue-300/20 bg-blue-300/10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge className="bg-blue-400/15 text-blue-200">Skynet bonus pulse</Badge>
                    <Badge className="bg-cyan-400/15 text-cyan-200">
                      {bonusPromptTrigger === "slowdown" ? "Triggered by slowdown" : bonusPromptTrigger === "welcome-back" ? "Welcome-back task" : bonusPromptTrigger === "completed" ? "Completed pulse" : "Manual pulse"}
                    </Badge>
                  </div>
                  <h3 className="text-3xl font-black">Stay active, unlock extra WBN.</h3>
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
                    When activity slows down, Skynet can surface a fresh bonus task to keep the session moving. These are optional momentum prompts designed to deepen interaction, improve the model, and open extra testnet reward chances without forcing crypto participation.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Btn onClick={() => spinBonusPrompt("manual")} variant="purple">Spin Bonus Prompt</Btn>
                  <Btn onClick={() => { setBonusPromptInput(""); setBonusPromptResult(null); setBonusPromptTrigger("manual"); }} variant="dark">Dismiss</Btn>
                </div>
              </div>

              <div className="mt-5 grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-blue-200">Active Bonus Mission</p>
                      <h4 className="mt-1 text-2xl font-black">{selectedBonusPrompt?.title}</h4>
                    </div>
                    <Badge className="bg-emerald-400/15 text-emerald-200">{selectedBonusPrompt?.reward || 0} {SYMBOL}</Badge>
                  </div>
                  <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">{selectedBonusPrompt?.prompt}</p>
                  <textarea
                    value={bonusPromptInput}
                    onChange={(e: any) => { setBonusPromptInput(e.target.value); setLastEngagementAt(Date.now()); }}
                    placeholder="Jump back in with a quick rescue prompt, deeper follow-up, launch line, or sharper feedback..."
                    className="mt-4 min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-blue-300/60"
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Btn onClick={completeBonusPrompt} disabled={!earnEnabled}>Complete Bonus Prompt</Btn>
                    <Btn onClick={() => spinBonusPrompt("manual")} variant="dark">Reroll Prompt</Btn>
                  </div>
                  {renderEarnTaskResult(bonusPromptResult)}
                </div>

                <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <div className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Base Reward</p>
                    <p className="mt-2 text-2xl font-black">{fmt(bonusPreview.baseReward)} {SYMBOL}</p>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Potential Payout</p>
                    <p className="mt-2 text-2xl font-black text-blue-200">{fmt(bonusPreview.finalReward)} {SYMBOL}</p>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Quality Score</p>
                    <p className="mt-2 text-2xl font-black">{bonusScore.qualityScore}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4 md:col-span-3 lg:col-span-1 xl:col-span-3">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Payout tuning</p>
                    <p className="mt-2 text-sm text-slate-300">{bonusPreview.summary}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 md:col-span-3 lg:col-span-1 xl:col-span-3">
                    <p className="font-bold text-emerald-200">Engagement trigger</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Slowdown prompts appear after inactivity, and welcome-back prompts can surface when the user returns after leaving the tab. The goal is to keep interaction alive with useful tasks, not to mint rewards for idle time.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold">Model Feedback Lane</h3>
                    <p className="mt-1 text-sm text-slate-400">Reward useful reports that make Skynet sharper, faster, and less repetitive.</p>
                  </div>
                  <Badge className="bg-violet-400/15 text-violet-200">{REWARD_LANE_LABELS.model_feedback}</Badge>
                </div>
                <div className="space-y-3">
                  {AI_FEEDBACK_TASKS.map((task: any) => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedFeedbackTaskId(task.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${selectedFeedbackTask?.id === task.id ? "border-violet-300 bg-violet-300/10" : "border-white/10 bg-black/20 hover:bg-white/10"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold">{task.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-violet-200">{task.category}</p>
                        </div>
                        <Badge className="bg-emerald-400/15 text-emerald-200">{task.reward} {SYMBOL}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-slate-400">{task.prompt}</p>
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedbackTaskInput}
                  onChange={(e: any) => setFeedbackTaskInput(e.target.value)}
                  placeholder="Describe a slow answer, hallucination, repeated phrase, weak tone, or how the answer should be rewritten..."
                  className="mt-4 min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-violet-300/60"
                />
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Base Reward</p>
                    <p className="mt-2 text-2xl font-black">{fmt(feedbackPreview.baseReward)} {SYMBOL}</p>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Potential Payout</p>
                    <p className="mt-2 text-2xl font-black text-violet-200">{fmt(feedbackPreview.finalReward)} {SYMBOL}</p>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Quality Score</p>
                    <p className="mt-2 text-2xl font-black">{feedbackScore.qualityScore}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                  <b className="text-violet-200">Payout tuning:</b> {feedbackPreview.summary}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Btn onClick={completeFeedbackTask} disabled={!earnEnabled} variant="purple">Submit Feedback Reward</Btn>
                  <Btn onClick={() => { setFeedbackTaskInput(""); setFeedbackTaskResult(null); }} variant="dark">Clear</Btn>
                </div>
                {renderEarnTaskResult(feedbackTaskResult)}
              </Card>

              <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold">Learning Lane</h3>
                    <p className="mt-1 text-sm text-slate-400">Reward teach-back, safety understanding, and governance comprehension that proves the AI was useful.</p>
                  </div>
                  <Badge className="bg-emerald-400/15 text-emerald-200">{REWARD_LANE_LABELS.learning}</Badge>
                </div>
                <div className="space-y-3">
                  {LEARNING_TASKS.map((task: any) => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedLearningTaskId(task.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${selectedLearningTask?.id === task.id ? "border-emerald-300 bg-emerald-300/10" : "border-white/10 bg-black/20 hover:bg-white/10"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold">{task.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-emerald-200">{task.category}</p>
                        </div>
                        <Badge className="bg-cyan-400/15 text-cyan-200">{task.reward} {SYMBOL}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-slate-400">{task.prompt}</p>
                    </button>
                  ))}
                </div>
                <textarea
                  value={learningTaskInput}
                  onChange={(e: any) => setLearningTaskInput(e.target.value)}
                  placeholder="Summarize what you learned from Skynet about wallet safety, governance, validators, or the Webnett reward loop..."
                  className="mt-4 min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/60"
                />
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Base Reward</p>
                    <p className="mt-2 text-2xl font-black">{fmt(learningPreview.baseReward)} {SYMBOL}</p>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Potential Payout</p>
                    <p className="mt-2 text-2xl font-black text-emerald-200">{fmt(learningPreview.finalReward)} {SYMBOL}</p>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Quality Score</p>
                    <p className="mt-2 text-2xl font-black">{learningScore.qualityScore}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                  <b className="text-emerald-200">Payout tuning:</b> {learningPreview.summary}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Btn onClick={completeLearningTask} disabled={!earnEnabled} variant="green">Submit Learning Reward</Btn>
                  <Btn onClick={() => { setLearningTaskInput(""); setLearningTaskResult(null); }} variant="dark">Clear</Btn>
                </div>
                {renderEarnTaskResult(learningTaskResult)}
              </Card>

              <Card>
                <h3 className="mb-4 text-2xl font-bold">Daily Rewards</h3>
                <p className="mb-4 text-sm text-slate-400">
                  Small daily rewards keep the testnet loop active without paying for raw message spam.
                </p>
                <div className="space-y-3">
                  {DAILY_REWARD_ACTIONS.map((action: any) => {
                    const paid = earnedMissionToday(action.id);
                    const locked = action.id === "daily-feedback-rating" && !aiTaskResult?.ok;
                    return (
                      <div key={action.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-bold">{action.title}</p>
                            <p className="mt-1 text-sm text-slate-400">{action.description}</p>
                          </div>
                          <Badge className={paid ? "bg-slate-400/15 text-slate-300" : "bg-emerald-400/15 text-emerald-200"}>
                            {!earnEnabled ? "Paused" : paid ? "Paid today" : `${action.reward} ${SYMBOL}`}
                          </Badge>
                        </div>
                        <div className="mt-3">
                          <Btn
                            onClick={() => recordEarnEvent(action, "Daily reward")}
                            disabled={!earnEnabled || paid || locked}
                            variant={paid ? "dark" : "green"}
                          >
                            {!earnEnabled ? "Rewards Paused" : paid ? "Already Claimed" : locked ? "Complete AI Mission First" : "Claim Daily"}
                          </Btn>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 text-2xl font-bold">Community Rewards</h3>
                <p className="mb-4 text-sm text-slate-400">
                  Referral-style rewards start as local testnet actions. Later, these can connect to real accounts, invite codes, and reputation.
                </p>
                <div className="space-y-3">
                  {COMMUNITY_REWARD_ACTIONS.map((action: any) => {
                    const paid = earnedMissionToday(action.id);
                    return (
                      <div key={action.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-bold">{action.title}</p>
                            <p className="mt-1 text-sm text-slate-400">{action.description}</p>
                          </div>
                          <Badge className={paid ? "bg-slate-400/15 text-slate-300" : "bg-violet-400/15 text-violet-200"}>
                            {!earnEnabled ? "Paused" : paid ? "Paid today" : `${action.reward} ${SYMBOL}`}
                          </Badge>
                        </div>
                        <div className="mt-3">
                          <Btn
                            onClick={() => recordEarnEvent(action, "Community reward")}
                            disabled={!earnEnabled || paid}
                            variant={paid ? "dark" : "purple"}
                          >
                            {!earnEnabled ? "Rewards Paused" : paid ? "Already Claimed" : "Record Contribution"}
                          </Btn>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
              <Card>
                <h3 className="mb-4 text-2xl font-bold">Network Contribution Rewards</h3>
                <p className="mb-4 text-sm text-slate-400">
                  These rewards trigger automatically when the matching Webnett action succeeds. Each can pay once per day.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {NETWORK_REWARD_ACTIONS.map((action: any) => {
                    const paid = earnedMissionToday(action.id);
                    return (
                      <div key={action.id} className={`rounded-2xl border p-4 ${paid ? "border-emerald-300/30 bg-emerald-300/10" : "border-white/10 bg-black/25"}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-bold">{action.title}</p>
                          <Badge className={paid ? "bg-emerald-400/15 text-emerald-200" : earnEnabled ? "bg-cyan-400/15 text-cyan-200" : "bg-slate-400/15 text-slate-300"}>
                            {!earnEnabled ? "Paused" : paid ? "Paid" : `${action.reward} ${SYMBOL}`}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">{action.description}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
              <Card>
                <h3 className="mb-4 text-2xl font-bold">Reward Ledger</h3>
                {earnLedger.length === 0 ? (
                  <p className="rounded-2xl bg-black/25 p-4 text-slate-400">No earn rewards yet. Complete an AI mission to create the first claimable entry.</p>
                ) : (
                  <div className="max-h-96 space-y-3 overflow-auto pr-1">
                    {earnLedger.map((entry: any) => (
                      <div key={entry.id} className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-bold">{entry.title}</p>
                            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">{entry.category}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {entry.lane && <Badge className="bg-cyan-400/15 text-cyan-200">{REWARD_LANE_LABELS[entry.lane] || entry.lane}</Badge>}
                            <Badge className={entry.status === "claimed" ? "bg-emerald-400/15 text-emerald-200" : "bg-yellow-400/15 text-yellow-200"}>{entry.status}</Badge>
                          </div>
                        </div>
                        <p className="mt-3"><b>{fmt(entry.amount)} {SYMBOL}</b> - {entry.source}</p>
                        <p className="mt-1 text-slate-400">{new Date(entry.createdAt).toLocaleString()}</p>
                        {entry.summary && <p className="mt-2 line-clamp-2 text-slate-400">{entry.summary}</p>}
                        {entry.payoutSummary && <p className="mt-2 text-slate-300">Payout basis: {entry.payoutSummary}</p>}
                        {entry.rewardReason && <p className="mt-2 text-slate-400">{entry.rewardReason}</p>}
                        {entry.qualityScore ? <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">Quality {entry.qualityScore}</p> : null}
                        {entry.txId && <p className="mt-2 break-all text-xs text-emerald-200">Claim tx: {entry.txId}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <h3 className="mb-4 text-2xl font-bold">Earning Idea Bank</h3>
                <p className="mb-4 text-sm text-slate-400">
                  V1 ships AI missions first. The larger bank keeps games, learning, community, validator, security, and creator loops ready for the next release.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {EARNING_IDEA_CATEGORIES.map((group: any) => (
                    <div key={group.category} className="rounded-2xl bg-black/25 p-4">
                      <p className="font-bold text-cyan-200">{group.category}</p>
                      <p className="mt-1 text-sm text-slate-400">{group.ideas.length} reward ideas</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
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
                          <p className="mt-2 text-xs font-bold text-cyan-200">Signature Status: {tx.signatureStatus || "Not signed"}</p>
                          {tx.payloadHash && <p className="break-all text-xs text-slate-500">Payload Hash: {tx.payloadHash}</p>}
                          <p className="mt-2 text-xs font-bold text-yellow-200">Risk Level: {tx.riskScore || "None"}</p>
                          {tx.riskReasons?.length > 0 && <p className="text-xs text-slate-400">Risk Reasons: {tx.riskReasons.join(" ")}</p>}
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

                  <div className="mb-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                      <Coins className="h-5 w-5 text-emerald-200" /> WBN Currency Analytics
                    </h3>
                    <div className="mb-4 grid gap-3 text-sm md:grid-cols-4">
                      <div className="rounded-xl bg-black/25 p-3"><b>{fmt(currencyAnalytics.stats.totalWalletBalance)} {SYMBOL}</b><br /><span className="text-slate-400">Wallet Supply</span></div>
                      <div className="rounded-xl bg-black/25 p-3"><b>{fmt(currencyAnalytics.stats.pendingVolume)} {SYMBOL}</b><br /><span className="text-slate-400">Pending Volume</span></div>
                      <div className="rounded-xl bg-black/25 p-3"><b>{fmt(currencyAnalytics.stats.confirmedUserVolume)} {SYMBOL}</b><br /><span className="text-slate-400">Confirmed Volume</span></div>
                      <div className="rounded-xl bg-black/25 p-3"><b>{fmt(currencyAnalytics.stats.confirmedFees + currencyAnalytics.stats.pendingFees)} {SYMBOL}</b><br /><span className="text-slate-400">Total Fees</span></div>
                      <div className="rounded-xl bg-black/25 p-3"><b>{fmt(currencyAnalytics.stats.rewardPool)} {SYMBOL}</b><br /><span className="text-slate-400">Reward Pool</span></div>
                      <div className="rounded-xl bg-black/25 p-3"><b>{fmt(currencyAnalytics.stats.totalStaked)} {SYMBOL}</b><br /><span className="text-slate-400">Validator Stake</span></div>
                      <div className="rounded-xl bg-black/25 p-3"><b>{currencyAnalytics.stats.blockCount}</b><br /><span className="text-slate-400">Blocks</span></div>
                      <div className="rounded-xl bg-black/25 p-3"><b>{currencyAnalytics.stats.userTransferCount}</b><br /><span className="text-slate-400">User Transfers</span></div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-black/25 p-4">
                        <p className="mb-2 font-bold text-emerald-200">Top Wallet Balances</p>
                        <div className="max-h-52 space-y-2 overflow-auto pr-1 text-sm">
                          {currencyAnalytics.walletBalances.slice(0, 8).map((item: any) => (
                            <div key={item.address} className="rounded-xl bg-white/5 p-3">
                              <div className="flex flex-wrap justify-between gap-2">
                                <b>{fmt(item.balance)} {SYMBOL}</b>
                                <span className="text-xs text-slate-400">{short(item.address)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-black/25 p-4">
                        <p className="mb-2 font-bold text-cyan-200">Block Volume Timeline</p>
                        <div className="max-h-52 space-y-2 overflow-auto pr-1 text-sm">
                          {currencyAnalytics.blockSeries.slice().reverse().map((block: any) => (
                            <div key={block.blockIndex} className="rounded-xl bg-white/5 p-3">
                              <div className="flex flex-wrap justify-between gap-2">
                                <b>Block #{block.blockIndex}</b>
                                <span className="text-emerald-200">{fmt(block.volume)} {SYMBOL}</span>
                              </div>
                              <p className="text-xs text-slate-400">TX: {block.transactions} · Fees: {fmt(block.fees)} {SYMBOL}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mb-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                      <Activity className="h-5 w-5 text-cyan-200" /> Webnett Network Graph
                    </h3>
                    <div className="mb-4 grid gap-3 text-sm md:grid-cols-4">
                      <div className="rounded-xl bg-black/25 p-3"><b>{networkGraph.stats.nodeCount}</b><br /><span className="text-slate-400">Nodes</span></div>
                      <div className="rounded-xl bg-black/25 p-3"><b>{networkGraph.stats.linkCount}</b><br /><span className="text-slate-400">Links</span></div>
                      <div className="rounded-xl bg-black/25 p-3"><b>{networkGraph.stats.pendingLinks}</b><br /><span className="text-slate-400">Pending</span></div>
                      <div className="rounded-xl bg-black/25 p-3"><b>{networkGraph.stats.confirmedLinks}</b><br /><span className="text-slate-400">Confirmed</span></div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-black/25 p-4">
                        <p className="mb-2 font-bold text-cyan-200">Network Nodes</p>
                        <div className="max-h-52 space-y-2 overflow-auto pr-1 text-sm">
                          {networkGraph.nodes.map((node: any) => (
                            <div key={node.id} className="rounded-xl bg-white/5 p-3">
                              <div className="flex flex-wrap justify-between gap-2">
                                <b>{node.label}</b>
                                <span className="text-xs text-slate-400">{node.type}</span>
                              </div>
                              <p className="break-all text-xs text-slate-500">{node.id}</p>
                              {node.stake > 0 && <p className="text-xs text-emerald-200">Stake: {fmt(node.stake)} {SYMBOL}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-black/25 p-4">
                        <p className="mb-2 font-bold text-emerald-200">Transaction Links</p>
                        <div className="max-h-52 space-y-2 overflow-auto pr-1 text-sm">
                          {networkGraph.links.slice().reverse().map((link: any) => (
                            <div key={link.id} className="rounded-xl bg-white/5 p-3">
                              <div className="flex flex-wrap justify-between gap-2">
                                <b>{fmt(link.amount)} {SYMBOL}</b>
                                <span className={link.status === "Pending" ? "text-yellow-200" : "text-emerald-200"}>{link.status}</span>
                              </div>
                              <p className="break-all text-xs text-slate-500">From: {link.from}</p>
                              <p className="break-all text-xs text-slate-500">To: {link.to}</p>
                              <p className="text-xs text-cyan-200">Signature: {link.signatureStatus}</p>
                              <p className="text-xs text-yellow-200">Risk: {link.riskScore}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
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
                        {selectedReceipt.signatureStatus && <p><span className="text-slate-400">Receipt Signature Status:</span> {selectedReceipt.signatureStatus}</p>}
                        {selectedReceipt.payloadHash && <p className="break-all"><span className="text-slate-400">Payload Hash:</span> {selectedReceipt.payloadHash}</p>}
                        {selectedReceipt.riskScore && <p><span className="text-slate-400">Risk Level:</span> {selectedReceipt.riskScore}</p>}
                        {selectedReceipt.riskReasons?.length > 0 && <p><span className="text-slate-400">Risk Reasons:</span> {selectedReceipt.riskReasons.join(" ")}</p>}
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

        {tab === "profile" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
            <Card className="border-cyan-300/20 bg-cyan-300/10">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-cyan-300/20 p-3">
                  <UserCog className="h-6 w-6 text-cyan-100" />
                </div>
                <div>
                  <h2 className="text-3xl font-black">Account Console</h2>
                  <p className="text-sm text-slate-300">Local prototype profile for Webnett Earn and Skynet-linked missions.</p>
                </div>
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-300">
                  Display name
                  <InputBox value={userProfile.displayName} onChange={(e: any) => updateProfileField("displayName", e.target.value)} className="mt-2" />
                </label>
                <label className="block text-sm font-bold text-slate-300">
                  Handle
                  <InputBox value={userProfile.handle} onChange={(e: any) => updateProfileField("handle", e.target.value)} className="mt-2" />
                </label>
                <label className="block text-sm font-bold text-slate-300">
                  Email
                  <InputBox value={userProfile.email} onChange={(e: any) => updateProfileField("email", e.target.value)} placeholder="optional for the prototype" className="mt-2" />
                </label>
                <label className="block text-sm font-bold text-slate-300">
                  Role
                  <InputBox value={userProfile.role} onChange={(e: any) => updateProfileField("role", e.target.value)} className="mt-2" />
                </label>
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-slate-300">
                <p><b>Account status:</b> {accountReady ? "Ready for local preview" : "Finish the profile fields"}</p>
                <p><b>Joined:</b> {new Date(userProfile.joinedAt).toLocaleString()}</p>
                <p><b>Selected wallet:</b> {selectedWallet?.address ? short(selectedWallet.address) : "No wallet selected"}</p>
              </div>
            </Card>

            <Card>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-3xl font-black"><Gift className="text-emerald-200" /> Invite & Reputation</h2>
                  <p className="mt-2 text-sm text-slate-400">CryptoTab-style growth, but for useful AI work and tester contribution, not passive spam.</p>
                </div>
                <Badge className="bg-emerald-400/15 text-emerald-200">Demo/testnet only</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-black/25 p-4"><b>Level {earnProfile.level}</b><br /><span className="text-slate-400">{earnProfile.xp} XP</span></div>
                <div className="rounded-2xl bg-black/25 p-4"><b>{fmt(earnProfile.totalEarned)} {SYMBOL}</b><br /><span className="text-slate-400">Lifetime earned</span></div>
                <div className="rounded-2xl bg-black/25 p-4"><b>{earnProfile.completedMissions}</b><br /><span className="text-slate-400">Contributions</span></div>
              </div>
              <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">Your tester invite</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <code className="rounded-2xl bg-black/40 px-4 py-3 text-cyan-100">{userProfile.inviteCode}</code>
                  <Btn onClick={copyInviteCode} variant="dark"><Copy className="mr-2 inline h-4 w-4" />Copy Link</Btn>
                </div>
                <p className="mt-3 break-all text-xs text-slate-400">{inviteLink}</p>
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-5">
                <p className="font-bold">Claim a tester invite</p>
                <p className="mt-1 text-sm text-slate-400">Paste another tester code to simulate a referral reward. Each invite reward can pay once per day.</p>
                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                  <InputBox value={inviteInput} onChange={(e: any) => setInviteInput(e.target.value)} placeholder="WBN-INVITE" />
                  <Btn onClick={claimInviteReward} variant="green">Claim Invite</Btn>
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === "settings" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-3xl font-black"><Settings className="text-cyan-200" /> Settings</h2>
              <div className="space-y-3">
                {[
                  ["earnProgramEnabled", "Enable Webnett Earn"],
                  ["rewardNotifications", "Reward notifications"],
                  ["publicProfile", "Public profile preview"],
                  ["showPrototypeNotices", "Show prototype notices"],
                  ["compactMode", "Compact interface mode"],
                  ["autoOpenSkynet", "Auto-open Skynet after Earn mission"],
                ].map(([key, label]: any) => (
                  <label key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                    <span>
                      <b>{label}</b>
                      <span className="block text-sm text-slate-400">
                        {key === "earnProgramEnabled"
                          ? "Turn rewards off while keeping the AI and wallet tools available."
                          : key === "showPrototypeNotices"
                            ? "Keep demo/testnet wording visible."
                            : "Local browser preference."}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(userSettings[key])}
                      onChange={(e) => updateSetting(key, e.target.checked)}
                      className="h-5 w-5 accent-cyan-300"
                    />
                  </label>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-3xl font-black"><Sparkles className="text-emerald-200" /> Skynet Bridge</h2>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-5 text-sm">
                <p><b>Status:</b> <span className={skynetStatus.backendReady ? "text-emerald-300" : "text-yellow-300"}>{skynetStatus.backendReady ? "Connected" : skynetStatus.status}</span></p>
                <p><b>Model line:</b> {skynetStatus.releaseLabel}</p>
                <p><b>Mode:</b> {skynetStatus.agentMode || "bridge standby"}</p>
                <p><b>Last latency:</b> {skynetStatus.lastLatencySeconds ? `${skynetStatus.lastLatencySeconds}s` : "n/a"}</p>
                <p><b>Pending shell claims:</b> {skynetClaimInbox.pendingCount}</p>
                <p><b>Queued shell WBN:</b> {fmt(skynetPendingWbn)} {SYMBOL}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Btn onClick={refreshSkynetBridgeNow} variant="green">Check Bridge</Btn>
                <Btn onClick={openSkynetConsole} variant="purple"><ExternalLink className="mr-2 inline h-4 w-4" />Open Skynet</Btn>
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <h2 className="mb-4 flex items-center gap-2 text-3xl font-black"><Trash2 className="text-red-300" /> Data Controls</h2>
              <p className="mb-4 text-sm leading-6 text-slate-400">These controls are local to this browser preview. Production auth and server-side accounts come later.</p>
              <div className="flex flex-wrap gap-3">
                <Btn onClick={clearActivityLog} variant="dark">Clear Activity Log</Btn>
                <Btn onClick={clearRewardLedger} variant="danger">Delete Reward Ledger</Btn>
                <Btn onClick={resetEarnOnly} variant="danger">Reset Earn Profile</Btn>
                <Btn onClick={reset} variant="danger">Reset Entire Testnet</Btn>
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














































