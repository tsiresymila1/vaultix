export interface UserData {
  id: string;
  email: string;
  public_key: string;
  encrypted_private_key: string;
  private_key_nonce: string;
  master_key_salt: string;
  full_name?: string;
}

export interface PasswordEntry {
  id: string;
  title: string;
  website_url: string | null;
  username: string | null;
  encrypted_password: string;
  password_nonce: string;
  encrypted_otp_seed: string | null;
  otp_nonce: string | null;
  notes: string | null;
  sealed_key: string; // entry key sealed to this user's public key
  shared: boolean;
  created_at: string | number;
}

export interface VaultixMessage {
  action: 'GET_PASSWORDS' | 'FILL_PASSWORD' | 'SAVE_PASSWORD' | 'DETECT_LOGIN';
  payload?: unknown;
}

export interface LoginFormData {
  username: string;
  password: string;
  url: string;
}