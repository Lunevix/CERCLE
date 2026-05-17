import {
  getPublicKey,
  isConnected,
  signTransaction,
} from '@stellar/freighter-api';

export async function connectWallet(): Promise<string> {
  const connected = await isConnected();
  if (!connected) throw new Error('Freighter not installed');
  return getPublicKey();
}

export async function signTx(xdr: string, network: string): Promise<string> {
  const result = await signTransaction(xdr, { network }) as { error?: string; signedTxXdr?: string };
  if (result.error) throw new Error(result.error);
  if (!result.signedTxXdr) throw new Error('Failed to sign transaction');
  return result.signedTxXdr;
}
