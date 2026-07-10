// Content Script for Vaultix Chrome Extension
// Detects login forms and provides autofill functionality

// Only run autofill logic on non-localhost (production)
const hostname = window.location.hostname;
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('localhost:');
const isVaultixApp = hostname.includes('vaultix') || hostname.includes('vercel');

let shouldSkipAutofill = isLocalhost || isVaultixApp;

if (shouldSkipAutofill) {
  console.log('Vaultix: Skipping autofill on', hostname);
}

// Listen for messages from the web page (for auth flow) - works on all pages
window.addEventListener('message', async (event) => {
  if (event.data?.action === 'VAULTIX_AUTH_FROM_PAGE') {
    console.log('Vaultix: Received auth data from web page, forwarding to background...');
    // Forward to background script
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'VAULTIX_AUTH_DATA',
        payload: event.data
      });
      console.log('Vaultix: Forwarded to background, response:', response);
    } catch (err) {
      console.error('Vaultix: Failed to forward to background:', err);
    }
  }
});

if (shouldSkipAutofill) {
  // Don't run autofill logic on localhost/Vaultix, but keep message listener active
  console.log('Vaultix content script: skipping autofill, message listener active');
  // Don't throw - we need the message listener to stay active
}

interface VaultixMessage {
  action: string;
  payload?: unknown;
}

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((message: VaultixMessage, sender, sendResponse) => {
  if (message.action === 'TOGGLE_POPUP') {
    // Handle toggle from extension icon
    sendResponse({ success: true });
  }
  return true;
});

// Detect login forms on page load
function init() {
  const loginForm = detectLoginForm();
  
  if (loginForm) {
    // Add Vaultix indicator to the page
    addVaultixIndicator(loginForm);
    
    // Listen for form submission to offer saving
    const form = document.querySelector('form');
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }
  }
}

interface LoginFormInfo {
  usernameField: string;
  passwordField: string;
  form: HTMLFormElement;
}

function detectLoginForm(): LoginFormInfo | null {
  const usernameSelectors = [
    'input[type="email"]',
    'input[type="text"][name*="user"]',
    'input[name*="login"]',
    'input[name*="username"]',
    'input[id*="username"]',
    'input[id*="login"]',
    'input[autocomplete="username"]',
    'input[autocomplete="email"]'
  ];
  
  const passwordSelectors = [
    'input[type="password"]',
    'input[name*="password"]',
    'input[id*="password"]',
    'input[autocomplete*="password"]'
  ];
  
  const usernameEl = document.querySelector(usernameSelectors.join(', ')) as HTMLInputElement | null;
  const passwordEl = document.querySelector(passwordSelectors.join(', ')) as HTMLInputElement | null;
  const form = usernameEl?.closest('form') || passwordEl?.closest('form');
  
  if (usernameEl && passwordEl) {
    return {
      usernameField: usernameEl.name || usernameEl.id || 'username',
      passwordField: passwordEl.name || passwordEl.id || 'password',
      form: form as HTMLFormElement
    };
  }
  
  return null;
}

function addVaultixIndicator(loginForm: LoginFormInfo) {
  // Create a subtle indicator that Vaultix is available
  const indicator = document.createElement('div');
  indicator.id = 'vaultix-indicator';
  indicator.style.cssText = `
    position: absolute;
    top: -30px;
    right: 0;
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    color: white;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 600;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 999999;
  `;
  indicator.textContent = '🔐 Vaultix';
  indicator.title = 'Click to autofill with Vaultix';
  
  // Add to password field
  const passwordField = loginForm.form.querySelector('input[type="password"]');
  if (passwordField) {
    const wrapper = passwordField.parentElement;
    if (wrapper) {
      wrapper.style.position = 'relative';
      wrapper.appendChild(indicator);
      
      // Show on focus
      passwordField.addEventListener('focus', () => {
        indicator.style.opacity = '1';
      });
      
      // Add click handler
      indicator.addEventListener('click', async (e) => {
        e.preventDefault();
        await triggerAutofill(loginForm);
      });
    }
  }
}

async function triggerAutofill(loginForm: LoginFormInfo) {
  // Check if vault is unlocked
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_UNLOCK_STATUS' });
    
    if (!response.unlocked) {
      // Trigger popup to unlock
      chrome.runtime.sendMessage({ action: 'OPEN_POPUP' });
      return;
    }
    
    // Get passwords for this domain
    const currentUrl = window.location.hostname;
    const passwordsResponse = await chrome.runtime.sendMessage({ 
      action: 'GET_PASSWORDS',
      payload: { url: currentUrl }
    });
    
    if (passwordsResponse.passwords?.length > 0) {
      // If multiple, show selector - for now, use first
      const entry = passwordsResponse.passwords[0];
      
      // Fill the fields
      const usernameField = loginForm.form.querySelector('input[name*="user"], input[name*="login"], input[type="email"], input[type="text"]') as HTMLInputElement;
      const passwordField = loginForm.form.querySelector('input[type="password"]') as HTMLInputElement;
      
      if (usernameField && entry.username) {
        usernameField.value = entry.username;
        usernameField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      if (passwordField) {
        // We need to get the actual decrypted password
        const decryptedResponse = await chrome.runtime.sendMessage({
          action: 'GET_DECRYPTED_PASSWORD',
          payload: { entryId: entry.id }
        });
        
        if (decryptedResponse.password) {
          passwordField.value = decryptedResponse.password;
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    } else {
      // No passwords found for this site
      console.log('Vaultix: No passwords found for', currentUrl);
    }
  } catch (err) {
    console.error('Vaultix autofill error:', err);
  }
}

function handleFormSubmit(e: Event) {
  const form = e.target as HTMLFormElement;
  
  // Don't intercept if already handled by Vaultix
  if (form.dataset.vaultixHandled === 'true') {
    return;
  }
  
  const usernameField = form.querySelector('input[name*="user"], input[name*="login"], input[type="email"], input[type="text"]') as HTMLInputElement;
  const passwordField = form.querySelector('input[type="password"]') as HTMLInputElement;
  
  if (usernameField && passwordField) {
    const username = usernameField.value;
    const password = passwordField.value;
    const url = window.location.href;
    
    if (username && password) {
      // Send to background to handle save
      chrome.runtime.sendMessage({
        action: 'OFFER_SAVE_PASSWORD',
        payload: { username, password, url }
      });
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Watch for dynamically added forms (but not our own indicator)
let isInitialized = false;

const observer = new MutationObserver((mutations) => {
  if (isInitialized) return;
  
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      // Skip our own indicator element
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).id === 'vaultix-indicator') {
        continue;
      }
      if (mutation.addedNodes.length > 0 && !isInitialized) {
        init();
        isInitialized = true;
        break;
      }
    }
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

// Initial run (only once)
if (!isInitialized) {
  init();
  isInitialized = true;
}