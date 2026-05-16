import {
  Contract, Keypair, SorobanRpc, TransactionBuilder,
  nativeToScVal, xdr,
} from '@stellar/stellar-sdk';
import type { CercleConfig, ContributionResult } from './types';

/** Interact with a specific RotationalPool contract. */
export class CircleContract {
  private server: SorobanRpc.Server;

  constructor(
    private contractId: string,
    private config: CercleConfig,
  ) {
    this.server = new SorobanRpc.Server(config.rpcUrl);
  }

  async join(signerSecret: string): Promise<string> {
    const kp = Keypair.fromSecret(signerSecret);
    return this._send('join', [nativeToScVal(kp.publicKey(), { type: 'address' })], signerSecret);
  }

  async contribute(signerSecret: string): Promise<ContributionResult> {
    const kp = Keypair.fromSecret(signerSecret);
    const txHash = await this._send(
      'contribute',
      [nativeToScVal(kp.publicKey(), { type: 'address' })],
      signerSecret,
    );
    const cycle = await this.getCurrentCycle();
    return { txHash, cycleNumber: cycle, amount: 0n };
  }

  async getCurrentCycle(): Promise<number> {
    const result = await this._simulate('get_cycle', []);
    const map = result.map()!;
    return map.find(e => e.key().sym().toString() === 'cycle_number')?.val().u32() ?? 1;
  }

  async hasContributed(address: string, cycle: number): Promise<boolean> {
    const result = await this._simulate('has_contributed', [
      nativeToScVal(address, { type: 'address' }),
      nativeToScVal(cycle, { type: 'u32' }),
    ]);
    return result.bool();
  }

  private async _send(method: string, args: xdr.ScVal[], signerSecret: string): Promise<string> {
    const kp = Keypair.fromSecret(signerSecret);
    const account = await this.server.getAccount(kp.publicKey());
    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(new Contract(this.contractId).call(method, ...args))
      .setTimeout(30)
      .build();

    const prepared = await this.server.prepareTransaction(tx);
    prepared.sign(kp);
    const result = await this.server.sendTransaction(prepared);
    if (result.status === 'ERROR') throw new Error(`TX failed: ${result.errorResult}`);
    return result.hash;
  }

  private async _simulate(method: string, args: xdr.ScVal[]): Promise<xdr.ScVal> {
    const kp = Keypair.random();
    const account = await this.server.getAccount(kp.publicKey()).catch(() => {
      throw new Error('Cannot simulate without funded account');
    });
    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(new Contract(this.contractId).call(method, ...args))
      .setTimeout(30)
      .build();

    const sim = await this.server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) throw new Error(sim.error);
    return (sim as any).result?.retval ?? xdr.ScVal.scvVoid();
  }
}
