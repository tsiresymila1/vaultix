import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Shield, Copy, LogOut, Plus, ExternalLink, Lock } from "lucide-react";
import {
  decryptSecret,
  decryptVaultKey,
  deriveMasterKey,
  decryptPrivateKey,
  fromBase64,
} from "../shared/crypto";
import type { PasswordEntry } from "../shared/types";
import { api, VAULTIX_URL } from "../shared/api";

const STORAGE_KEYS = {
  masterKey: "vaultix_master_key",
  userData: "vaultix_user_data",
  isUnlocked: "vaultix_is_unlocked",
  accessToken: "vaultix_access_token",
};

interface ExtensionUserData {
  id: string;
  email: string;
  pw_public_key: string | null;
  pw_encrypted_private_key: string | null;
  pw_private_key_nonce: string | null;
  pw_salt: string | null;
  full_name?: string;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [userData, setUserData] = useState<ExtensionUserData | null>(null);
  const [masterPassword, setMasterPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    initApp();

    // Listen for storage changes - if background updates storage, we can react
    const handleStorageChange = async (changes: any, areaName: string) => {
      if (areaName === "local" && changes[STORAGE_KEYS.isUnlocked]) {
        if (changes[STORAGE_KEYS.isUnlocked].newValue === true) {
          const result = await chrome.storage.local.get([
            STORAGE_KEYS.userData,
            STORAGE_KEYS.accessToken,
          ]);
          if (result[STORAGE_KEYS.userData]) {
            setUnlocked(true);
            setUserData(result[STORAGE_KEYS.userData] as ExtensionUserData);
            await loadPasswords();
            toast.success("Vault unlocked");
          }
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const initApp = async () => {
    try {
      // Check chrome.storage.local first - this is where background stores auth data
      const storageData = await chrome.storage.local.get([
        STORAGE_KEYS.accessToken,
        STORAGE_KEYS.userData,
        STORAGE_KEYS.isUnlocked,
        STORAGE_KEYS.masterKey,
      ]);
      console.log("InitApp: chrome.storage:", {
        hasToken: !!storageData[STORAGE_KEYS.accessToken],
        hasUserData: !!storageData[STORAGE_KEYS.userData],
        isUnlocked: storageData[STORAGE_KEYS.isUnlocked],
        hasMasterKey: !!storageData[STORAGE_KEYS.masterKey],
        userData: storageData[STORAGE_KEYS.userData],
      });

      if (
        storageData[STORAGE_KEYS.isUnlocked] &&
        storageData[STORAGE_KEYS.userData]
      ) {
        // We have auth data - set unlocked state
        setUnlocked(true);
        setUserData(storageData[STORAGE_KEYS.userData] as ExtensionUserData);

        // Try to load passwords (may fail if sodium unavailable, but that's ok)
        try {
          await loadPasswords();
        } catch (e) {
          console.log("Could not load passwords:", e);
        }

        setLoading(false);
        return;
      }

      if (storageData[STORAGE_KEYS.accessToken]) {
        await fetchUserData(storageData[STORAGE_KEYS.accessToken]);
        setLoading(false);
        return;
      }

      console.log("InitApp: No stored auth found");

      // Decoupled auth: the web app hands us only a token (+email) in the URL
      // hash. Store the token, fetch the user (including the raw private key)
      // from /me, and auto-unlock immediately — no master password prompt.
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const token = hashParams.get("token");
      const email = hashParams.get("email");

      if (token && email) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.accessToken]: token,
        });
        window.location.hash = "";
        await fetchUserData(token);
        setLoading(false);
        return;
      }

      const result = await chrome.storage.local.get([
        STORAGE_KEYS.accessToken,
        STORAGE_KEYS.userData,
        STORAGE_KEYS.isUnlocked,
      ]);

      if (result[STORAGE_KEYS.isUnlocked] && result[STORAGE_KEYS.userData]) {
        setUnlocked(true);
        setUserData(result[STORAGE_KEYS.userData] as ExtensionUserData);
        await loadPasswords();
      } else if (result[STORAGE_KEYS.accessToken]) {
        await fetchUserData(result[STORAGE_KEYS.accessToken]);
      }
    } catch (err) {
      console.error("Error initializing app:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (token: string) => {
    try {
      setAuthenticating(true);

      const response = await api.extension.me.$get(
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) {
        if (response.status === 401) {
          await chrome.storage.local.remove([STORAGE_KEYS.accessToken]);
          return;
        }
        throw new Error("Failed to fetch user data");
      }

      const data = await response.json();
      const user = data.user as ExtensionUserData;

      // Zero-knowledge: the server only returns the ENCRYPTED password private
      // key. Persist the user record but stay LOCKED until the master password
      // is entered (see handleUnlock). If the password vault hasn't been set up
      // on the web yet, pw_public_key is null and we show a setup message.
      await chrome.storage.local.set({
        [STORAGE_KEYS.userData]: user,
      });

      setUserData(user);
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Failed to connect to Vaultix. Please sign in again.");
    } finally {
      setAuthenticating(false);
    }
  };

  // Master-password unlock: derive the master key from the password + the
  // user's pw_salt, use it to decrypt the password private key, and stash the
  // resulting pwPrivateKey as the per-session unlock material that both the
  // popup and the background service worker read to unseal entry keys.
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    if (
      !userData.pw_salt ||
      !userData.pw_encrypted_private_key ||
      !userData.pw_private_key_nonce
    ) {
      setError("Set up your password vault on the web app first");
      return;
    }

    setError("");
    setUnlocking(true);
    try {
      const masterKey = await deriveMasterKey(
        masterPassword,
        await fromBase64(userData.pw_salt),
      );
      // Wrong password → this throws (auth tag mismatch).
      const pwPrivateKey = await decryptPrivateKey(
        userData.pw_encrypted_private_key,
        userData.pw_private_key_nonce,
        masterKey,
      );

      await chrome.storage.local.set({
        [STORAGE_KEYS.masterKey]: { privateKey: pwPrivateKey },
        [STORAGE_KEYS.isUnlocked]: true,
      });

      setMasterPassword("");
      setUnlocked(true);
      await loadPasswords();
      toast.success("Vault unlocked");
    } catch {
      setError("Incorrect master password");
    } finally {
      setUnlocking(false);
    }
  };

  const handleOAuthLogin = async () => {
    const redirectUri = `chrome-extension://${chrome.runtime.id}/popup/index.html`;
    const authUrl = `${VAULTIX_URL}/api/extension/auth?callback=${encodeURIComponent(redirectUri)}`;

    await chrome.tabs.create({ url: authUrl });
  };

  const loadPasswords = async () => {
    try {
      const tokenResult = await chrome.storage.local.get(
        STORAGE_KEYS.accessToken,
      );
      const token = tokenResult[STORAGE_KEYS.accessToken];

      console.log("loadPasswords: token:", token ? "present" : "missing");
      if (!token) return;

      console.log("loadPasswords: fetching from API...");
      const response = await api.extension.passwords.$get(
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      console.log("loadPasswords: response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log(
          "loadPasswords: got passwords:",
          data.passwords?.length || 0,
        );
        setPasswords((data.passwords || []) as PasswordEntry[]);
      } else {
        const error = await response.text();
        console.log("loadPasswords: error:", error);
      }
    } catch (err) {
      console.error("Error loading passwords:", err);
    }
  };

  const handleSignOut = async () => {
    await chrome.storage.local.remove([
      STORAGE_KEYS.masterKey,
      STORAGE_KEYS.userData,
      STORAGE_KEYS.isUnlocked,
      STORAGE_KEYS.accessToken,
    ]);
    setUnlocked(false);
    setUserData(null);
    setPasswords([]);
    setMasterPassword("");
    setError("");
    toast.success("Signed out");
  };

  const handleCopyPassword = async (entry: PasswordEntry) => {
    try {
      const store = await chrome.storage.local.get([
        STORAGE_KEYS.masterKey,
        STORAGE_KEYS.userData,
      ]);
      const keyStore = store[STORAGE_KEYS.masterKey];
      const ud = store[STORAGE_KEYS.userData] as ExtensionUserData | undefined;
      if (!keyStore?.privateKey || !ud?.pw_public_key) {
        toast.error("Vault is locked");
        return;
      }

      // Envelope: unseal the entry key with our keypair, then decrypt.
      const entryKey = await decryptVaultKey(
        entry.sealed_key,
        ud.pw_public_key,
        keyStore.privateKey,
      );
      const decrypted = await decryptSecret(
        entry.encrypted_password,
        entry.password_nonce,
        entryKey,
      );

      await navigator.clipboard.writeText(decrypted);
      toast.success("Password copied");
    } catch {
      toast.error("Failed to copy password");
    }
  };

  const filteredPasswords = passwords.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.website_url || "").toLowerCase().includes(search.toLowerCase()),
  );

  if (loading || authenticating) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner" />
        </div>
        {authenticating && (
          <p
            style={{
              textAlign: "center",
              marginTop: "12px",
              fontSize: "12px",
              color: "#94a3b8",
            }}
          >
            Connecting to Vaultix...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div className="logo">
          <Shield />
        </div>
        <div>
          <h1>Vaultix</h1>
          <span className={`status ${unlocked ? "unlocked" : "locked"}`}>
            {unlocked ? "Unlocked" : "Locked"}
          </span>
        </div>
      </div>

      {!unlocked ? (
        <div className="unlock-form">
          {error && <div className="error-message">{error}</div>}

          {!userData ? (
            // Not signed in yet — start the OAuth flow.
            <div className="empty-state" style={{ padding: "20px 0" }}>
              <p
                style={{
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "#94a3b8",
                }}
              >
                Sign in with your Vaultix account to access your passwords
              </p>
              <button className="btn-primary" onClick={handleOAuthLogin}>
                <ExternalLink size={16} />
                Sign In with Vaultix
              </button>
            </div>
          ) : !userData.pw_public_key ? (
            // Signed in, but the password vault hasn't been created on the web.
            <div className="empty-state" style={{ padding: "20px 0" }}>
              <p
                style={{
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "#94a3b8",
                }}
              >
                Set up your password vault on the web app first
              </p>
              <button
                className="btn-primary"
                onClick={() => window.open(`${VAULTIX_URL}/passwords`, "_blank")}
              >
                <ExternalLink size={16} />
                Open Vaultix
              </button>
            </div>
          ) : (
            // Signed in with a password vault — ask for the master password.
            <form onSubmit={handleUnlock}>
              <p
                style={{
                  marginBottom: "12px",
                  fontSize: "13px",
                  color: "#94a3b8",
                }}
              >
                Enter your master password to unlock your vault
              </p>
              <input
                type="password"
                className="search-input"
                placeholder="Master password"
                value={masterPassword}
                autoFocus
                onChange={(e) => setMasterPassword(e.target.value)}
                style={{ marginBottom: "12px" }}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={unlocking || !masterPassword}
              >
                <Lock size={16} />
                {unlocking ? "Unlocking..." : "Unlock"}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="password-list">
          <input
            type="text"
            className="search-input"
            placeholder="Search passwords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {filteredPasswords.length === 0 ? (
            <div className="empty-state">
              <h3>No passwords found</h3>
              <p>Add passwords from the web app</p>
            </div>
          ) : (
            filteredPasswords.map((entry) => (
              <div key={entry.id} className="password-item">
                <div className="info">
                  <span className="title">{entry.title}</span>
                  <span className="url">
                    {entry.website_url || entry.username || "No URL"}
                  </span>
                </div>
                <div className="actions">
                  <button
                    className="icon-btn"
                    onClick={() => handleCopyPassword(entry)}
                    title="Copy password"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {unlocked && (
        <div className="footer">
          <button onClick={handleSignOut}>
            <LogOut
              size={14}
              style={{ marginRight: "4px", verticalAlign: "middle" }}
            />
            Sign out
          </button>
          <button
            onClick={() => window.open(`${VAULTIX_URL}/passwords`, "_blank")}
          >
            <Plus
              size={14}
              style={{ marginRight: "4px", verticalAlign: "middle" }}
            />
            Add New
          </button>
        </div>
      )}
    </div>
  );
}
