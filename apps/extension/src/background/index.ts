// Background Service Worker for Vaultix Chrome Extension

import { decryptSecret, decryptVaultKey } from "../shared/crypto";
import type { PasswordEntry, UserData } from "../shared/types";
import { api } from "../shared/api";

const STORAGE_KEYS = {
  masterKey: 'vaultix_master_key',
  userData: 'vaultix_user_data',
  isUnlocked: 'vaultix_is_unlocked',
  accessToken: 'vaultix_access_token',
};

interface Message {
  action: string;
  tabId?: number;
  payload?: unknown;
}

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message: Message, sender: chrome.runtime.MessageSender) {
  switch (message.action) {
    case 'GET_UNLOCK_STATUS':
      return await getUnlockStatus();
      
    case 'GET_MASTER_KEY':
      return await getMasterKey();
      
    case 'GET_PASSWORDS':
      return await getPasswords(message.payload as { url?: string } | undefined);

    case 'GET_DECRYPTED_PASSWORD':
      return await getDecryptedPassword(message.payload as { entryId: string });

    case 'DETECT_LOGIN':
      return await detectLoginForm(message.tabId!);
      
    case 'FILL_PASSWORD':
      return await fillPassword(message.payload as { entryId: string; tabId: number });
      
    case 'SAVE_PASSWORD':
      return await savePassword(message.payload as { username: string; password: string; url: string });
      
    case 'VAULTIX_AUTH_DATA':
      // Store auth data from web auth flow
      return await handleWebAuthData(message.payload as any);
      
    default:
      return { error: 'Unknown action' };
  }
}

async function handleWebAuthData(data: any) {
  console.log('Background: Received auth data', data);
  
  // Extract the actual auth data (could be nested in payload or at top level)
  const authData = data.token ? data : (data.payload || data);
  const { token, email, privateKey, masterKeySalt, encryptedPrivateKey, privateKeyNonce } = authData;
  
  console.log('Background: Processing auth for', email);
  const userData = {
    id: '',
    email: email,
    public_key: '',
    encrypted_private_key: encryptedPrivateKey,
    private_key_nonce: privateKeyNonce,
    master_key_salt: masterKeySalt
  };

  await chrome.storage.local.set({
    [STORAGE_KEYS.accessToken]: token,
    [STORAGE_KEYS.userData]: userData,
    [STORAGE_KEYS.masterKey]: { key: privateKey, privateKey: privateKey },
    [STORAGE_KEYS.isUnlocked]: true
  });
  
  console.log('Background: Auth data stored in chrome.storage');

  // Notify popup if it's open
  try {
    const views = chrome.extension.getViews({ type: 'popup' });
    if (views.length > 0) {
      views[0].postMessage({ action: 'VAULTIX_AUTH_DATA_RECEIVED' }, '*');
    }
  } catch (e) {
    console.log('Could not notify popup');
  }

  return { success: true };
}

async function getUnlockStatus() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.isUnlocked, STORAGE_KEYS.userData]);
  return {
    unlocked: result[STORAGE_KEYS.isUnlocked] || false,
    userData: result[STORAGE_KEYS.userData] || null
  };
}

async function getMasterKey() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.masterKey);
  return result[STORAGE_KEYS.masterKey] || null;
}

async function fetchPasswords(): Promise<PasswordEntry[]> {
  const { [STORAGE_KEYS.accessToken]: token } = await chrome.storage.local.get(
    STORAGE_KEYS.accessToken,
  );
  if (!token) return [];
  const res = await api.extension.passwords.$get(
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.passwords ?? []) as PasswordEntry[];
}

function hostMatches(entryUrl: string | null, host?: string): boolean {
  if (!host) return true;
  if (!entryUrl) return false;
  const u = entryUrl.toLowerCase().replace(/^https?:\/\//, "");
  return host.toLowerCase().includes(u) || u.includes(host.toLowerCase());
}

async function getPasswords(payload?: { url?: string }) {
  const all = await fetchPasswords();
  const passwords = all.filter((p) => hostMatches(p.website_url, payload?.url));
  return { passwords };
}

// Unseal the entry key with our keypair, then decrypt the password (envelope).
async function getDecryptedPassword(payload: { entryId: string }) {
  try {
    const store = await chrome.storage.local.get([
      STORAGE_KEYS.masterKey,
      STORAGE_KEYS.userData,
    ]);
    const keyStore = store[STORAGE_KEYS.masterKey] as { privateKey?: string } | undefined;
    const ud = store[STORAGE_KEYS.userData] as UserData | undefined;
    if (!keyStore?.privateKey || !ud?.public_key) {
      return { error: "locked" };
    }
    const all = await fetchPasswords();
    const entry = all.find((p) => p.id === payload.entryId);
    if (!entry) return { error: "not found" };

    const entryKey = await decryptVaultKey(entry.sealed_key, ud.public_key, keyStore.privateKey);
    const password = await decryptSecret(entry.encrypted_password, entry.password_nonce, entryKey);
    return { password };
  } catch {
    return { error: "decrypt failed" };
  }
}

async function detectLoginForm(tabId: number) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: detectLoginFields
    });
    
    if (results && results[0]?.result) {
      return { detected: true, ...results[0].result };
    }
    return { detected: false };
  } catch (err) {
    return { detected: false, error: err.message };
  }
}

async function fillPassword(payload: { entryId: string; tabId: number }) {
  // Implementation for filling password
  // Would need to get decrypted password and fill the form
  return { success: true };
}

async function savePassword(payload: { username: string; password: string; url: string }) {
  // Implementation for saving new password
  // This would encrypt and save to Supabase
  return { success: true };
}

// Function to detect login forms - runs in page context
function detectLoginFields() {
  const selectors = {
    username: [
      'input[type="email"]',
      'input[type="text"][name*="user"]',
      'input[name*="login"]',
      'input[name*="username"]',
      'input[id*="username"]',
      'input[id*="login"]',
      'input[autocomplete="username"]',
      'input[autocomplete="email"]'
    ].join(', '),
    password: [
      'input[type="password"]',
      'input[name*="password"]',
      'input[id*="password"]',
      'input[autocomplete="current-password"]',
      'input[autocomplete="new-password"]'
    ].join(', ')
  };
  
  const usernameEl = document.querySelector(selectors.username) as HTMLInputElement | null;
  const passwordEl = document.querySelector(selectors.password) as HTMLInputElement | null;
  
  if (usernameEl && passwordEl) {
    return {
      usernameField: usernameEl.name || usernameEl.id || 'username',
      passwordField: passwordEl.name || passwordEl.id || 'password',
      actionUrl: (document.querySelector('form') as HTMLFormElement)?.action || window.location.href
    };
  }
  
  return null;
}

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_POPUP' });
  }
});

console.log('Vaultix background service worker loaded');