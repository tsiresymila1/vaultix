// Docs: https://www.instantdb.com/docs/modeling-data
import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    // System entity — identity created by magic-code auth.
    $users: i.entity({
      email: i.string().unique().indexed(),
    }),

    // Per-user profile holding zero-knowledge crypto material + app fields.
    // The DB only ever stores ciphertext/nonces + the public key.
    profiles: i.entity({
      publicKey: i.string(),
      encryptedPrivateKey: i.string(),
      privateKeyNonce: i.string(),
      masterKeySalt: i.string(),
      fullName: i.string().optional(),
      role: i.string().indexed(), // "admin" | "moderator" | "user"
      status: i.string().indexed(), // "active" | "restricted" | "banned"
      settings: i.json().optional(),
      createdAt: i.date().indexed(),
    }),

    vaults: i.entity({
      name: i.string(),
      createdAt: i.date().indexed(),
    }),

    // Sharing/RBAC join: one row per (vault, member) with that member's
    // vault key sealed to their public key.
    vaultMembers: i.entity({
      role: i.string(), // "owner" | "admin" | "moderator" | "member"
      encryptedVaultKey: i.string(),
      createdAt: i.date().indexed(),
    }),

    environments: i.entity({
      name: i.string(),
      createdAt: i.date().indexed(),
    }),

    secrets: i.entity({
      key: i.string(),
      encryptedPayload: i.string(),
      nonce: i.string(),
      createdAt: i.date().indexed(),
    }),

    // Envelope model: content is encrypted with a random per-entry key; that key
    // is sealed to the owner's public key (ownerEncryptedKey) and, when shared,
    // to each recipient's public key (passwordShares.encryptedKey).
    passwordEntries: i.entity({
      title: i.string(),
      websiteUrl: i.string().optional(),
      username: i.string().optional(),
      encryptedPassword: i.string(),
      passwordNonce: i.string(),
      encryptedOtpSeed: i.string().optional(),
      otpNonce: i.string().optional(),
      notes: i.string().optional(),
      ownerEncryptedKey: i.string(), // entry key sealed to owner's public key
      createdAt: i.date().indexed(),
      updatedAt: i.date().indexed(),
    }),

    // Ephemeral one-time secure notes shared by unguessable link.
    sharedSecrets: i.entity({
      encryptedPayload: i.string(),
      nonce: i.string(),
      expiresAt: i.date().indexed(),
      viewsRemaining: i.number(),
      createdAt: i.date().indexed(),
    }),

    deletionRequests: i.entity({
      email: i.string(),
      reason: i.string().optional(),
      status: i.string().indexed(), // "pending" | "processed" | "rejected"
      createdAt: i.date().indexed(),
    }),

    // Grants a recipient live access to a passwordEntry: the entry's key sealed
    // to the recipient's public key. Content lives on the entry (not copied), so
    // owner edits are seen by all recipients automatically.
    passwordShares: i.entity({
      encryptedKey: i.string(), // entry key sealed to recipient's public key
      createdAt: i.date().indexed(),
    }),
  },
  links: {
    // profile <-> $users (1-1)
    profileUser: {
      forward: { on: "profiles", has: "one", label: "$user" },
      reverse: { on: "$users", has: "one", label: "profile" },
    },
    // vault -> owner profile (many vaults per owner)
    vaultOwner: {
      forward: { on: "vaults", has: "one", label: "owner" },
      reverse: { on: "profiles", has: "many", label: "ownedVaults" },
    },
    // vaultMembers -> vault (many members per vault)
    vaultMembersVault: {
      forward: { on: "vaultMembers", has: "one", label: "vault" },
      reverse: { on: "vaults", has: "many", label: "members" },
    },
    // vaultMembers -> member profile (many memberships per profile)
    vaultMembersProfile: {
      forward: { on: "vaultMembers", has: "one", label: "member" },
      reverse: { on: "profiles", has: "many", label: "memberships" },
    },
    // environments -> vault
    environmentsVault: {
      forward: { on: "environments", has: "one", label: "vault" },
      reverse: { on: "vaults", has: "many", label: "environments" },
    },
    // secrets -> vault
    secretsVault: {
      forward: { on: "secrets", has: "one", label: "vault" },
      reverse: { on: "vaults", has: "many", label: "secrets" },
    },
    // secrets -> environment
    secretsEnvironment: {
      forward: { on: "secrets", has: "one", label: "environment" },
      reverse: { on: "environments", has: "many", label: "secrets" },
    },
    // passwordEntries -> owner profile
    passwordEntriesOwner: {
      forward: { on: "passwordEntries", has: "one", label: "owner" },
      reverse: { on: "profiles", has: "many", label: "passwordEntries" },
    },
    // sharedSecrets -> creator profile (optional)
    sharedSecretsCreator: {
      forward: { on: "sharedSecrets", has: "one", label: "creator" },
      reverse: { on: "profiles", has: "many", label: "sharedSecrets" },
    },
    // deletionRequests -> requester profile (optional)
    deletionRequestsProfile: {
      forward: { on: "deletionRequests", has: "one", label: "requester" },
      reverse: { on: "profiles", has: "many", label: "deletionRequests" },
    },
    // passwordShares -> the shared entry
    passwordSharesEntry: {
      forward: { on: "passwordShares", has: "one", label: "entry" },
      reverse: { on: "passwordEntries", has: "many", label: "shares" },
    },
    // passwordShares -> recipient profile
    passwordSharesRecipient: {
      forward: { on: "passwordShares", has: "one", label: "recipient" },
      reverse: { on: "profiles", has: "many", label: "receivedPasswordShares" },
    },
    // passwordShares -> sharedBy profile
    passwordSharesSharedBy: {
      forward: { on: "passwordShares", has: "one", label: "sharedBy" },
      reverse: { on: "profiles", has: "many", label: "sentPasswordShares" },
    },
  },
});

// Type helpers
type AppSchema = typeof _schema;
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
