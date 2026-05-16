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
  const result = await signTransaction(xdr, { network });
  if ('error' in result) throw new Error(result.error);
  return result.signedTxXdr;
}
