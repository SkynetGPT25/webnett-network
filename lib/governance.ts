// @ts-nocheck

export function getOpenProposalCount(proposals: any[] = []) {
  return proposals.filter((proposal) => proposal.status === "Open").length;
}

export function getProposalVoteStats(proposal: any) {
  const votes = Object.values(proposal?.votes || {}) as any[];

  const yesPower = votes
    .filter((vote) => vote.choice === "yes")
    .reduce((sum, vote) => sum + (vote.stake || 0), 0);

  const noPower = votes
    .filter((vote) => vote.choice === "no")
    .reduce((sum, vote) => sum + (vote.stake || 0), 0);

  const totalVotePower = yesPower + noPower;

  return {
    votes,
    yesPower,
    noPower,
    totalVotePower,
    yesPercent: totalVotePower > 0 ? (yesPower / totalVotePower) * 100 : 0,
    noPercent: totalVotePower > 0 ? (noPower / totalVotePower) * 100 : 0,
  };
}

export function buildProposal({ id, title, description }: any) {
  return {
    id,
    title: title.trim(),
    description: description.trim() || "No description provided.",
    status: "Open",
    createdAt: new Date().toLocaleString(),
    votes: {},
  };
}
