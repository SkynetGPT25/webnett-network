// @ts-nocheck

export function getTotalStaked(validators: any[] = []) {
  return validators.reduce((sum, validator) => sum + (validator.stake || 0), 0);
}

export function getSelectedValidator(validators: any[] = [], selectedWallet: any) {
  return validators.find((validator) => validator.address === selectedWallet?.address);
}

export function getSelectedStake(selectedValidator: any) {
  return selectedValidator?.stake || 0;
}

export function getSpendableBalance(rawBalance: number, selectedStake: number) {
  return Math.max(0, (rawBalance || 0) - (selectedStake || 0));
}

export function getVotingPower(totalStaked: number, selectedValidator: any) {
  return totalStaked > 0 && selectedValidator
    ? (selectedValidator.stake / totalStaked) * 100
    : 0;
}

export function getRewardShare(totalStaked: number, selectedValidator: any, rewardPool: number) {
  return totalStaked > 0 && selectedValidator
    ? rewardPool * (selectedValidator.stake / totalStaked)
    : 0;
}

export function getSpendableBalances(balances: any = {}, validators: any[] = []) {
  const lockedByAddress = validators.reduce((acc, validator) => {
    acc[validator.address] = (acc[validator.address] || 0) + validator.stake;
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(balances).map(([address, balance]: any) => [
      address,
      Math.max(0, balance - (lockedByAddress[address] || 0)),
    ])
  );
}
