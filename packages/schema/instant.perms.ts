// Docs: https://www.instantdb.com/docs/permissions
// Re-expresses the former Postgres RLS model. Authorization is anchored on
// `auth.id` (the $users id) traversed through the vault-membership graph.
//
// Membership path from a vault-scoped entity:
//   secret/environment -> vault -> members (vaultMembers) -> member (profile) -> $user
// so `auth.id in data.ref('vault.members.member.$user.id')` == "current user is a
// member of this entity's vault".
//
// NOTE: the Admin SDK (CLI/extension proxy routes, cron) bypasses these rules and
// scopes every query manually by the JWT's userId.
//
// Vault + membership + environment + secret WRITES are all routed through the
// role-checked admin API (`/api/vaults/*`), so their client write rules are
// `false` here — InstantDB permissions can't express "caller is a manager of
// this specific vault" (role-filtered ref), and this is how read-only members
// are enforced. Reads stay client-side (live queries) via the membership graph.
import type { InstantRules } from "@instantdb/react";

const rules = {
  profiles: {
    allow: {
      // Own profile, plus profiles of anyone who shares a vault with you
      // (needed to read a member's public key when sharing a vault key).
      view: "isOwner || sharesAVault",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: [
      "isOwner",
      "auth.id != null && auth.id in data.ref('$user.id')",
      "sharesAVault",
      "auth.id != null && auth.id in data.ref('memberships.vault.members.member.$user.id')",
    ],
  },

  vaults: {
    // Writes via /api/vaults (admin, role-checked).
    allow: {
      view: "isMember",
      create: "false",
      update: "false",
      delete: "false",
    },
    bind: [
      "isMember",
      "auth.id != null && auth.id in data.ref('members.member.$user.id')",
    ],
  },

  vaultMembers: {
    // Membership managed via /api/vaults/members (admin, role-checked).
    allow: {
      // Any member of the vault can see the membership rows (to render the roster).
      view: "auth.id != null && auth.id in data.ref('vault.members.member.$user.id')",
      create: "false",
      update: "false",
      delete: "false",
    },
  },

  environments: {
    // Writes via /api/vaults/environments (admin, manager-only).
    allow: {
      view: "isMember",
      create: "false",
      update: "false",
      delete: "false",
    },
    bind: [
      "isMember",
      "auth.id != null && auth.id in data.ref('vault.members.member.$user.id')",
    ],
  },

  secrets: {
    // Writes via /api/vaults/secrets (admin, manager-only). Read-only members
    // can view but not mutate — enforced here (create/update/delete = false).
    allow: {
      view: "isMember",
      create: "false",
      update: "false",
      delete: "false",
    },
    bind: [
      "isMember",
      "auth.id != null && auth.id in data.ref('vault.members.member.$user.id')",
    ],
  },

  passwordEntries: {
    allow: {
      // Owner, or a user this entry has been shared with (read-only for them).
      view: "isOwner || isSharedWithMe",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: [
      "isOwner",
      "auth.id != null && auth.id in data.ref('owner.$user.id')",
      "isSharedWithMe",
      "auth.id != null && auth.id in data.ref('shares.recipient.$user.id')",
    ],
  },

  // Ephemeral link-shared notes: readable by anyone holding the (unguessable) id;
  // TTL + view-count enforced server-side by the cleanup cron / read route.
  sharedSecrets: {
    allow: {
      view: "true",
      create: "auth.id != null",
      update: "auth.id != null && auth.id in data.ref('creator.$user.id')",
      delete: "auth.id != null && auth.id in data.ref('creator.$user.id')",
    },
  },

  deletionRequests: {
    allow: {
      view: "isAdmin",
      create: "auth.id != null",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: ["isAdmin", "auth.id != null && 'admin' in auth.ref('$user.profile.role')"],
  },

  // Visible to the recipient and the sharer. Created/revoked via the admin route
  // (linking another user's profile requires admin privileges).
  passwordShares: {
    allow: {
      view: "auth.id != null && (auth.id in data.ref('recipient.$user.id') || auth.id in data.ref('sharedBy.$user.id'))",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
} satisfies InstantRules;

export default rules;
