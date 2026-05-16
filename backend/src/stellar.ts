import {
  Contract, Keypair, Networks, SorobanRpc,
  TransactionBuilder, nativeToScVal, xdr,
} from '@stellar/stellar-sdk';
import logger from './logger';

const RPC_URL = process.env.STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org';
const PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET;
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY ?? '';
const FACTORY_ID = process.env.FACTORY_CONTRACT_ID ?? '';
const REPUTATION_ID = process.env.REPUTATION_CONTRACT_ID ?? '';

const server = new SorobanRpc.Server(RPC_URL);

async function invokeContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  signerSecret: string,
): Promise<xdr.ScVal> {
  const kp = Keypair.fromSecret(signerSecret);
  const account = await server.getAccount(kp.publicKey());
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(kp);

  const result = await server.sendTransaction(prepared);
  if (result.status === 'ERROR') throw new Error(`Contract call failed: ${result.errorResult}`);

  // Poll for completion
  let getResult = await server.getTransaction(result.hash);
  for (let i = 0; i < 10 && getResult.status === 'NOT_FOUND'; i++) {
    await new Promise(r => setTimeout(r, 2000));
    getResult = await server.getTransaction(result.hash);
  }
  if (getResult.status !== 'SUCCESS') throw new Error('Transaction failed');
  return (getResult as any).returnValue;
}

export const stellarService = {
  async createCircle(params: {
    admin: string;
    contribution_amount: number;
    cycle_length_days: number;
    max_members: number;
    insurance_bps: number;
  }): Promise<string> {
    // In production: deploy a new RotationalPool contract via factory
    // Returns the new pool contract ID
    logger.info({ params }, 'Creating circle on-chain');
    const result = await invokeContract(
      FACTORY_ID,
      'create_circle',
      [
        nativeToScVal(params.admin, { type: 'address' }),
        nativeToScVal(params.contribution_amount, { type: 'i128' }),
        nativeToScVal(params.cycle_length_days, { type: 'u32' }),
        nativeToScVal(params.max_members, { type: 'u32' }),
        nativeToScVal(params.insurance_bps, { type: 'u32' }),
        nativeToScVal(FACTORY_ID, { type: 'address' }), // pool_contract placeholder
      ],
      ADMIN_SECRET,
    );
    return result.toString();
  },

  async joinCircle(contractId: string, memberAddress: string): Promise<void> {
    logger.info({ contractId, memberAddress }, 'Joining circle on-chain');
    // Member signs their own join tx — in production this is submitted client-side
    // Backend can relay for SMS users
  },

  async submitContribution(contractId: string, memberAddress: string): Promise<string> {
    logger.info({ contractId, memberAddress }, 'Submitting contribution on-chain');
    // Returns tx hash
    return 'tx_hash_placeholder';
  },

  async getReputation(address: string): Promise<number> {
    if (!REPUTATION_ID) return 500;
    try {
      const result = await invokeContract(
        REPUTATION_ID,
        'get_score',
        [nativeToScVal(address, { type: 'address' })],
        ADMIN_SECRET,
      );
      return Number(result.i32());
    } catch {
      return 500;
    }
  },
};
