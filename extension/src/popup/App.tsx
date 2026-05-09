import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Shield, Unlock, Copy, Eye, EyeOff, LogOut, Plus } from 'lucide-react';
import { deriveMasterKey, fromBase64, toBase64, decryptSecret, decryptPrivateKey } from '../shared/crypto';
import type { PasswordEntry, UserData } from '../shared/types';

declare const sodium: typeof import('libsodium-wrappers-sumo');

const STORAGE_KEYS = {
  masterKey: 'vaultix_master_key',
  userData: 'vaultix_user_data',
  isUnlocked: 'vaultix_is_unlocked'
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initLoading, setInitLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [search, setSearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      await sodium.ready;
      const result = await chrome.storage.local.get([STORAGE_KEYS.isUnlocked, STORAGE_KEYS.userData]);
      if (result[STORAGE_KEYS.isUnlocked] && result[STORAGE_KEYS.userData]) {
        setUnlocked(true);
        setUserData(result[STORAGE_KEYS.userData] as UserData);
        await loadPasswords();
      }
    } catch (err) {
      console.error('Error checking status:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPasswords = async () => {
    try {
      const { data: userResult } = await chrome.storage.local.get(STORAGE_KEYS.userData);
      if (!userResult) return;

      const result = await chrome.storage.local.get(STORAGE_KEYS.masterKey);
      const masterKey = result[STORAGE_KEYS.masterKey];
      
      if (!masterKey) return;

      // For now, show empty - in production would fetch from Supabase via message to background
      setPasswords([]);
    } catch (err) {
      console.error('Error loading passwords:', err);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInitLoading(true);

    try {
      await sodium.ready;
      
      const storageResult = await chrome.storage.local.get(STORAGE_KEYS.userData);
      const storedUserData = storageResult[STORAGE_KEYS.userData] as UserData | undefined;
      
      if (!storedUserData?.master_key_salt) {
        setError('No salt found. Please sign in from the web app first.');
        setInitLoading(false);
        return;
      }

      const salt = await fromBase64(storedUserData.master_key_salt);
      const masterKey = await deriveMasterKey(password, salt);
      const masterKeyB64 = await toBase64(masterKey);

      const decryptedPrivateKey = await decryptPrivateKey(
        storedUserData.encrypted_private_key,
        storedUserData.private_key_nonce,
        masterKey
      );

      await chrome.storage.local.set({
        [STORAGE_KEYS.masterKey]: { key: masterKeyB64, privateKey: decryptedPrivateKey },
        [STORAGE_KEYS.isUnlocked]: true
      });

      setUnlocked(true);
      setUserData(storedUserData);
      setPassword('');
      await loadPasswords();
      toast.success('Vault unlocked');
    } catch (err) {
      console.error('Unlock error:', err);
      setError(err instanceof Error ? err.message : 'Invalid password');
    } finally {
      setInitLoading(false);
    }
  };

  const handleLock = async () => {
    await chrome.storage.local.remove([STORAGE_KEYS.masterKey, STORAGE_KEYS.isUnlocked]);
    setUnlocked(false);
    setPasswords([]);
    toast.success('Vault locked');
  };

  const handleCopyPassword = async (entry: PasswordEntry) => {
    try {
      const { data } = await chrome.storage.local.get(STORAGE_KEYS.masterKey);
      if (!data[STORAGE_KEYS.masterKey]) {
        toast.error('Vault is locked');
        return;
      }

      const decrypted = await decryptSecret(
        entry.encrypted_password,
        entry.password_nonce,
        data[STORAGE_KEYS.masterKey].key
      );

      await navigator.clipboard.writeText(decrypted);
      toast.success('Password copied');
    } catch (err) {
      toast.error('Failed to copy password');
    }
  };

  const filteredPasswords = passwords.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.website_url || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner" />
        </div>
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
          <span className={`status ${unlocked ? 'unlocked' : 'locked'}`}>
            {unlocked ? 'Unlocked' : 'Locked'}
          </span>
        </div>
      </div>

      {!unlocked ? (
        <form className="unlock-form" onSubmit={handleUnlock}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Master Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your master password"
                style={{ paddingRight: '40px', width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading || !password}>
            {loading ? <div className="spinner" /> : <><Unlock size={16} /> Unlock</>}
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
                  <span className="url">{entry.website_url || entry.username || 'No URL'}</span>
                </div>
                <div className="actions">
                  <button className="icon-btn" onClick={() => handleCopyPassword(entry)} title="Copy password">
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
            <LogOut size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Lock
          </button>
          <button onClick={() => window.open('https://vaultix.dev/passwords', '_blank')}>
            <Plus size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Add New
          </button>
        </div>
      )}
    </div>
  );
}