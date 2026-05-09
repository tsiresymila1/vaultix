// Background Service Worker for Vaultix Chrome Extension

const STORAGE_KEYS = {
  masterKey: 'vaultix_master_key',
  userData: 'vaultix_user_data',
  isUnlocked: 'vaultix_is_unlocked'
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
      return await getPasswords();
      
    case 'DETECT_LOGIN':
      return await detectLoginForm(message.tabId!);
      
    case 'FILL_PASSWORD':
      return await fillPassword(message.payload as { entryId: string; tabId: number });
      
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

async function getPasswords() {
  // This would normally query Supabase, but for now we'll return empty
  // In production, implement proper sync logic
  return { passwords: [] };
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