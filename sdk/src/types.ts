export interface CercleConfig {
  rpcUrl: string;
  networkPassphrase: string;
  factoryContractId: string;
  reputationContractId: string;
  insuranceContractId: string;
}

export interface CircleInfo {
  id: bigint;
  admin: string;
  contributionAmount: bigint;
  cycleLengthDays: number;
  maxMembers: number;
  insuranceBps: number;
  poolContract: string;
  active: boolean;
}

export interface MemberInfo {
  address: string;
  joinOrder: number;
  status: 'active' | 'defaulted';
}

export interface ContributionResult {
  txHash: string;
  cycleNumber: number;
  amount: bigint;
}

export interface ReputationRecord {
  score: number;
  totalContributions: number;
  onTimeContributions: number;
  defaults: number;
  circlesCompleted: number;
}
