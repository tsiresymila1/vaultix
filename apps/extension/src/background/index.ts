// Background Service Worker for Vaultix Chrome Extension

import {
  decryptSecret,
  decryptVaultKey,
  generateVaultKey,
  encryptSecret,
  encryptVaultKeyForUser,
} from "../shared/crypto";
import type { PasswordEntry, UserData } from "../shared/types";
import { api, bearer } from "../shared/api";

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

    case 'SAVE_PASSWORD':
      return await savePassword(message.payload as { username: string; password: string; url: string });

    default:
      return { error: 'Unknown action' };
  }
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
    if (!keyStore?.privateKey || !ud?.pw_public_key) {
      return { error: "locked" };
    }
    const all = await fetchPasswords();
    const entry = all.find((p) => p.id === payload.entryId);
    if (!entry) return { error: "not found" };

    const entryKey = await decryptVaultKey(entry.sealed_key, ud.pw_public_key, keyStore.privateKey);
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

// Envelope save: generate a fresh per-entry key, encrypt the password with it,
// seal that key to the user's own public key, and POST only ciphertext + sealed
// key to the API. Plaintext and keys never leave the extension.
async function savePassword(payload: { username: string; password: string; url: string }) {
  try {
    const store = await chrome.storage.local.get([
      STORAGE_KEYS.masterKey,
      STORAGE_KEYS.userData,
      STORAGE_KEYS.accessToken,
    ]);
    const keyStore = store[STORAGE_KEYS.masterKey] as { privateKey?: string } | undefined;
    const ud = store[STORAGE_KEYS.userData] as UserData | undefined;
    const token = store[STORAGE_KEYS.accessToken] as string | undefined;

    // Requires an unlocked vault: decrypted private key + the user's password
    // public key (which only exists once the vault is set up on the web app).
    if (!keyStore?.privateKey || !token) {
      return { error: "locked" };
    }
    if (!ud?.pw_public_key) {
      return { error: "password vault not set up" };
    }

    const { username, password, url } = payload;

    // Derive a human-friendly title from the URL hostname.
    let title = url;
    try {
      title = new URL(url).hostname;
    } catch {
      // keep the raw url as the title if it can't be parsed
    }

    // (b) fresh per-entry key, (c) encrypt password with it,
    // (d) seal the entry key to the user's own public key.
    const entryKey = await generateVaultKey();
    const { cipher: encryptedPassword, nonce: passwordNonce } = await encryptSecret(password, entryKey);
    const ownerEncryptedKey = await encryptVaultKeyForUser(entryKey, ud.pw_public_key);

    // (e) POST only ciphertext + sealed key.
    const res = await api.passwords.$post(
      {
        json: {
          title,
          websiteUrl: url,
          username,
          encryptedPassword,
          passwordNonce,
          ownerEncryptedKey,
        },
      },
      { headers: bearer(token) },
    );

    if (!res.ok) return { error: "save failed" };
    const data = await res.json();
    return { success: true, entryId: data.entryId };
  } catch {
    return { error: "save failed" };
  }
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