import {
  Contract, Keypair, SorobanRpc, TransactionBuilder,
  nativeToScVal, xdr, Networks,
} from '@stellar/stellar-sdk';
import type { CercleConfig, CircleInfo, ReputationRecord } from './types';

export class CercleClient {
  private server: SorobanRpc.Server;

  constructor(private config: CercleConfig) {
    this.server = new SorobanRpc.Server(config.rpcUrl);
  }

  /** Create a new savings circle. Returns circle ID. */
  async createCircle(params: {
    signerSecret: string;
    contributionAmount: bigint;
    cycleLengthDays: number;
    maxMembers: number;
    insuranceBps?: number;
  }): Promise<bigint> {
    const kp = Keypair.fromSecret(params.signerSecret);
    const result = await this._invoke(
      this.config.factoryContractId,
      'create_circle',
      [
        nativeToScVal(kp.publicKey(), { type: 'address' }),
        nativeToScVal(params.contributionAmount, { type: 'i128' }),
        nativeToScVal(params.cycleLengthDays, { type: 'u32' }),
        nativeToScVal(params.maxMembers, { type: 'u32' }),
        nativeToScVal(params.insuranceBps ?? 200, { type: 'u32' }),
        nativeToScVal(this.config.factoryContractId, { type: 'address' }),
      ],
      params.signerSecret,
    );
    return BigInt(result.u64().toString());
  }

  /** Get circle configuration from factory. */
  async getCircle(circleId: bigint): Promise<CircleInfo> {
    const result = await this._invoke(
      this.config.factoryContractId,
      'get_circle',
      [nativeToScVal(circleId, { type: 'u64' })],
      '', // read-only — no signing needed in simulation
    );
    const map = result.map()!;
    const get = (k: string) => map.find(e => e.key().sym().toString() === k)?.val();
    return {
      id: BigInt(get('id')!.u64().toString()),
      admin: get('admin')!.address().toString(),
      contributionAmount: BigInt(get('contribution_amount')!.i128().toString()),
      cycleLengthDays: get('cycle_length_days')!.u32(),
      maxMembers: get('max_members')!.u32(),
      insuranceBps: get('insurance_bps')!.u32(),
      poolContract: get('pool_contract')!.address().toString(),
      active: get('active')!.bool(),
    };
  }

  /** Get reputation score for an address. */
  async getReputation(address: string): Promise<ReputationRecord> {
    const result = await this._invoke(
      this.config.reputationContractId,
      'get_record',
      [nativeToScVal(address, { type: 'address' })],
      '',
    );
    const map = result.map()!;
    const get = (k: string) => map.find(e => e.key().sym().toString() === k)?.val();
    return {
      score: get('score')!.i32(),
      totalContributions: get('total_contributions')!.u32(),
      onTimeContributions: get('on_time_contributions')!.u32(),
      defaults: get('defaults')!.u32(),
      circlesCompleted: get('circles_completed')!.u32(),
    };
  }

  private async _invoke(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
    signerSecret: string,
  ): Promise<xdr.ScVal> {
    const kp = signerSecret ? Keypair.fromSecret(signerSecret) : null;
    const sourceKey = kp?.publicKey() ?? Keypair.random().publicKey();
    const account = await this.server.getAccount(sourceKey);
    const contract = new Contract(contractId);

    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    if (!kp) {
      // Simulate only
      const sim = await this.server.simulateTransaction(tx);
      if (SorobanRpc.Api.isSimulationError(sim)) throw new Error(sim.error);
      return (sim as any).result?.retval ?? xdr.ScVal.scvVoid();
    }

    const prepared = await this.server.prepareTransaction(tx);
    prepared.sign(kp);
    const send = await this.server.sendTransaction(prepared);
    if (send.status === 'ERROR') throw new Error(`TX error: ${send.errorResult}`);

    let get = await this.server.getTransaction(send.hash);
    for (let i = 0; i < 10 && get.status === 'NOT_FOUND'; i++) {
      await new Promise(r => setTimeout(r, 2000));
      get = await this.server.getTransaction(send.hash);
    }
    if (get.status !== 'SUCCESS') throw new Error('Transaction failed');
    return (get as any).returnValue ?? xdr.ScVal.scvVoid();
  }
}
