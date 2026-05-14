import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Shield,
  Unlock,
  Copy,
  Eye,
  EyeOff,
  LogOut,
  Plus,
  ExternalLink,
} from "lucide-react";
import {
  deriveMasterKey,
  fromBase64,
  toBase64,
  decryptSecret,
  decryptPrivateKey,
  initSodium,
} from "../shared/crypto";
import type { PasswordEntry } from "../shared/types";

const STORAGE_KEYS = {
  masterKey: "vaultix_master_key",
  userData: "vaultix_user_data",
  isUnlocked: "vaultix_is_unlocked",
  accessToken: "vaultix_access_token",
};

const VAULTIX_URL = "https://vaultix-secure.vercel.app";

interface ExtensionUserData {
  id: string;
  email: string;
  public_key: string;
  encrypted_private_key: string;
  private_key_nonce: string;
  master_key_salt: string;
  full_name?: string;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [search, setSearch] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [userData, setUserData] = useState<ExtensionUserData | null>(null);

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

    // Listen for auth data from web auth flow (only works if popup is open)
    const handleMessage = async (message: any) => {
      if (message.action === "VAULTIX_AUTH_DATA") {
        const {
          token,
          email,
          privateKey,
          masterKeySalt,
          encryptedPrivateKey,
          privateKeyNonce,
        } = message.data;

        const userData: ExtensionUserData = {
          id: "",
          email,
          public_key: "",
          encrypted_private_key: encryptedPrivateKey,
          private_key_nonce: privateKeyNonce,
          master_key_salt: masterKeySalt,
        };

        await chrome.storage.local.set({
          [STORAGE_KEYS.accessToken]: token,
          [STORAGE_KEYS.userData]: userData,
          [STORAGE_KEYS.masterKey]: { key: privateKey, privateKey: privateKey },
          [STORAGE_KEYS.isUnlocked]: true,
        });

        setUnlocked(true);
        setUserData(userData);
        await loadPasswords();
        toast.success("Vault unlocked via web auth");
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      chrome.runtime.onMessage.removeListener(handleMessage);
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

      if (webAuthData) {
        const authData = JSON.parse(webAuthData);
        console.log("InitApp: Processing web auth data", authData.email);

        const userData: ExtensionUserData = {
          id: "",
          email: authData.email,
          public_key: "",
          encrypted_private_key: authData.encrypted_private_key,
          private_key_nonce: authData.private_key_nonce,
          master_key_salt: authData.master_key_salt,
        };

        await chrome.storage.local.set({
          [STORAGE_KEYS.accessToken]: authData.token,
          [STORAGE_KEYS.userData]: userData,
          [STORAGE_KEYS.masterKey]: {
            key: authData.private_key,
            privateKey: authData.private_key,
          },
          [STORAGE_KEYS.isUnlocked]: true,
        });

        // Clear localStorage after processing
        localStorage.removeItem("vaultix_extension_auth");
        console.log("InitApp: Saved to chrome.storage, cleared localStorage");

        setUnlocked(true);
        setUserData(userData);
        setLoading(false);
        await loadPasswords();
        return;
      }

      // Check for token and private key in URL hash (returned from OAuth flow)
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const token = hashParams.get("token");
      const privateKey = hashParams.get("private_key");
      const email = hashParams.get("email");
      const masterKeySalt = hashParams.get("master_key_salt");
      const encryptedPrivateKey = hashParams.get("encrypted_private_key");
      const privateKeyNonce = hashParams.get("private_key_nonce");

      if (
        token &&
        privateKey &&
        email &&
        masterKeySalt &&
        encryptedPrivateKey &&
        privateKeyNonce
      ) {
        const userData: ExtensionUserData = {
          id: "",
          email,
          public_key: "",
          encrypted_private_key: encryptedPrivateKey,
          private_key_nonce: privateKeyNonce,
          master_key_salt: masterKeySalt,
        };

        await chrome.storage.local.set({
          [STORAGE_KEYS.accessToken]: token,
          [STORAGE_KEYS.userData]: userData,
          [STORAGE_KEYS.masterKey]: { key: privateKey, privateKey: privateKey },
          [STORAGE_KEYS.isUnlocked]: true,
        });

        // Clear the hash
        window.location.hash = "";
        setUnlocked(true);
        setUserData(userData);
        await loadPasswords();
      } else {
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

      const response = await fetch(`${VAULTIX_URL}/api/extension/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await chrome.storage.local.remove([STORAGE_KEYS.accessToken]);
          return;
        }
        throw new Error("Failed to fetch user data");
      }

      const data = await response.json();

      await chrome.storage.local.set({
        [STORAGE_KEYS.userData]: data.user,
      });

      setUserData(data.user);
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Failed to connect to Vaultix. Please sign in again.");
    } finally {
      setAuthenticating(false);
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
      const response = await fetch(`${VAULTIX_URL}/api/extension/passwords`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("loadPasswords: response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log(
          "loadPasswords: got passwords:",
          data.passwords?.length || 0,
        );
        setPasswords(data.passwords || []);
      } else {
        const error = await response.text();
        console.log("loadPasswords: error:", error);
      }
    } catch (err) {
      console.error("Error loading passwords:", err);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAuthenticating(true);

    try {
      await sodium.ready;

      if (!userData?.master_key_salt) {
        setError("No user data found. Please sign in first.");
        setAuthenticating(false);
        return;
      }

      const salt = await fromBase64(userData.master_key_salt);
      const masterKey = await deriveMasterKey(password, salt);
      const masterKeyB64 = await toBase64(masterKey);

      const decryptedPrivateKey = await decryptPrivateKey(
        userData.encrypted_private_key,
        userData.private_key_nonce,
        masterKey,
      );

      await chrome.storage.local.set({
        [STORAGE_KEYS.masterKey]: {
          key: masterKeyB64,
          privateKey: decryptedPrivateKey,
        },
        [STORAGE_KEYS.isUnlocked]: true,
      });

      setUnlocked(true);
      setPassword("");
      await loadPasswords();
      toast.success("Vault unlocked");
    } catch (err) {
      console.error("Unlock error:", err);
      setError(err instanceof Error ? err.message : "Invalid password");
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLock = async () => {
    await chrome.storage.local.remove([
      STORAGE_KEYS.masterKey,
      STORAGE_KEYS.isUnlocked,
    ]);
    setUnlocked(false);
    setPasswords([]);
    toast.success("Vault locked");
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
    toast.success("Signed out");
  };

  const handleCopyPassword = async (entry: PasswordEntry) => {
    try {
      const { data } = await chrome.storage.local.get(STORAGE_KEYS.masterKey);
      if (!data[STORAGE_KEYS.masterKey]) {
        toast.error("Vault is locked");
        return;
      }

      const decrypted = await decryptSecret(
        entry.encrypted_password,
        entry.password_nonce,
        data[STORAGE_KEYS.masterKey].key,
      );

      await navigator.clipboard.writeText(decrypted);
      toast.success("Password copied");
    } catch (err) {
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

      {!userData ? (
        <div className="unlock-form">
          {error && <div className="error-message">{error}</div>}

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
        </div>
      ) : !unlocked ? (
        <form className="unlock-form" onSubmit={handleUnlock}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Master Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your master password"
                style={{ paddingRight: "40px", width: "100%" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={authenticating || !password}
          >
            {authenticating ? (
              <div className="spinner" />
            ) : (
              <>
                <Unlock size={16} /> Unlock
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              fontSize: "12px",
              cursor: "pointer",
              marginTop: "8px",
              width: "100%",
            }}
          >
            Sign out and use different account
          </button>
        </form>
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
          <button onClick={handleLock}>
            <LogOut
              size={14}
              style={{ marginRight: "4px", verticalAlign: "middle" }}
            />
            Lock
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
