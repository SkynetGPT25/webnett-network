// @ts-nocheck

export function scoreTransactionRisk({ tx, knownAddresses = [], spendable = 0 }: any) {
  const reasons: string[] = [];
  let score = 0;

  if (!tx?.to) {
    score += 40;
    reasons.push("Missing recipient address.");
  }

  if (!knownAddresses.includes(tx.to)) {
    score += 25;
    reasons.push("Recipient is not in known local wallets.");
  }

  if (Number(tx.amount || 0) > 250) {
    score += 20;
    reasons.push("Transfer amount is above the medium-risk demo threshold.");
  }

  if (Number(tx.amount || 0) + Number(tx.fee || 0) > Number(spendable || 0)) {
    score += 50;
    reasons.push("Transfer exceeds spendable wallet balance.");
  }

  if (tx.from === tx.to) {
    score += 30;
    reasons.push("Sender and recipient are the same wallet.");
  }

  const level =
    score >= 70 ? "High" :
    score >= 30 ? "Medium" :
    score > 0 ? "Low" :
    "None";

  return {
    score,
    level,
    reasons,
    approved: score < 70,
  };
}
