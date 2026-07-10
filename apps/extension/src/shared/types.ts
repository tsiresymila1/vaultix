export interface UserData {
  id: string;
  email: string;
  pw_public_key: string | null;
  pw_encrypted_private_key: string | null;
  pw_private_key_nonce: string | null;
  pw_salt: string | null;
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