export interface UserData {
    id: string;
    email: string;
    public_key: string;
    encrypted_private_key: string;
    private_key_nonce: string;
    master_key_salt: string;
    created_at: string;
    role: "admin" | "moderator" | "user";
    status: "active" | "restricted" | "banned";
    full_name: string | null;
    settings: UserSettings;
}

export interface UserSettings {
    theme?: "light" | "dark" | "system";
    email_notifications?: boolean;
    auto_lock?: boolean;
    lock_timeout?: number;
}

export interface Vault {
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
}

export interface Environment {
    id: string;
    name: string;
}

export interface Secret {
    id: string;
    key: string;
    encrypted_payload: string;
    nonce: string;
    environment_id: string;
    created_at: string;
}

export interface VaultMember {
    vault_id: string;
    user_id: string;
    encrypted_vault_key: string;
    key_nonce: string;
    role: "owner" | "admin" | "moderator" | "member";
    users?: {
        email: string;
        public_key: string;
    } | null;
}

export interface MemberData {
    encrypted_vault_key: string;
    users: {
        public_key: string;
    } | null;
}
