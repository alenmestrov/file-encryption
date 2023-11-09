import { connect, keyStores, WalletConnection } from 'near-api-js'
import { Buffer } from 'buffer';

window.Buffer = Buffer;

export async function initNEAR(nearConfig) {
  const near = await connect(Object.assign({ keyStore: new keyStores.BrowserLocalStorageKeyStore() }, nearConfig))
  window.nearAPI = near;
  window.walletConnection = new WalletConnection(near, 'near-api-js');
  await window.walletConnection._completeSignInWithAccessKey();
  // Getting the Account ID. If still unauthorized, it's just empty string
  window.accountId = await window.walletConnection.getAccountId();
  window.account = await window.walletConnection.account();
}

export function logout() {
  window.walletConnection.signOut();
  // reload page
  window.location.replace(window.location.origin + window.location.pathname)
}

export function login() {
  initNEAR({
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
    walletUrl: 'https://testnet.mynearwallet.com/',
    helperUrl: 'https://helper.testnet.near.org',
    explorerUrl: 'https://explorer.testnet.near.org',
  }).then(() => {
    window.walletConnection.requestSignIn({
      successUrl: window.location.origin + '?signedIn=true',
    });
  });
}
