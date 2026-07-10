import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "../types";
import {
  memberInviteSchema,
  memberRemoveSchema,
  vaultCreateSchema,
  vaultRenameSchema,
  vaultDeleteSchema,
  secretCreateSchema,
  secretImportSchema,
  secretUpdateSchema,
  secretsDeleteSchema,
  envCreateSchema,
  envRenameSchema,
  envDeleteSchema,
} from "../schemas";
import { rateLimitMw } from "../middleware/ratelimit";
import { instantAuth } from "../middleware/auth";
import { addMember, removeMember } from "../services/vault-members.service";
import {
  createVault,
  renameVault,
  deleteVault,
  createSecret,
  importSecrets,
  updateSecret,
  deleteSecrets,
  createEnvironment,
  renameEnvironment,
  deleteEnvironment,
} from "../services/vault-crud.service";

const factory = createFactory<AppEnv>();
const rl = (name: string) => rateLimitMw(name, 60, 60_000);

// --- vault ---
export const create = factory.createHandlers(
  rl("vault-create"),
  instantAuth,
  zValidator("json", vaultCreateSchema),
  async (c) => c.json(await createVault(c.get("user").id, c.req.valid("json"))),
);

export const rename = factory.createHandlers(
  rl("vault-create"),
  instantAuth,
  zValidator("json", vaultRenameSchema),
  async (c) => c.json(await renameVault(c.get("user").id, c.req.valid("json"))),
);

export const destroy = factory.createHandlers(
  rl("vault-create"),
  instantAuth,
  zValidator("json", vaultDeleteSchema),
  async (c) => c.json(await deleteVault(c.get("user").id, c.req.valid("json"))),
);

// --- members ---
export const invite = factory.createHandlers(
  rl("vault-members"),
  instantAuth,
  zValidator("json", memberInviteSchema),
  async (c) => c.json(await addMember(c.get("user").id, c.req.valid("json"))),
);

export const remove = factory.createHandlers(
  rl("vault-members"),
  instantAuth,
  zValidator("json", memberRemoveSchema),
  async (c) => c.json(await removeMember(c.get("user").id, c.req.valid("json").memberRowId)),
);

// --- secrets ---
export const secretCreate = factory.createHandlers(
  rl("vault-secrets"),
  instantAuth,
  zValidator("json", secretCreateSchema),
  async (c) => c.json(await createSecret(c.get("user").id, c.req.valid("json"))),
);

export const secretImport = factory.createHandlers(
  rl("vault-secrets"),
  instantAuth,
  zValidator("json", secretImportSchema),
  async (c) => c.json(await importSecrets(c.get("user").id, c.req.valid("json"))),
);

export const secretUpdate = factory.createHandlers(
  rl("vault-secrets"),
  instantAuth,
  zValidator("json", secretUpdateSchema),
  async (c) => c.json(await updateSecret(c.get("user").id, c.req.valid("json"))),
);

export const secretDelete = factory.createHandlers(
  rl("vault-secrets"),
  instantAuth,
  zValidator("json", secretsDeleteSchema),
  async (c) => c.json(await deleteSecrets(c.get("user").id, c.req.valid("json"))),
);

// --- environments ---
export const envCreate = factory.createHandlers(
  rl("vault-envs"),
  instantAuth,
  zValidator("json", envCreateSchema),
  async (c) => c.json(await createEnvironment(c.get("user").id, c.req.valid("json"))),
);

export const envRename = factory.createHandlers(
  rl("vault-envs"),
  instantAuth,
  zValidator("json", envRenameSchema),
  async (c) => c.json(await renameEnvironment(c.get("user").id, c.req.valid("json"))),
);

export const envDelete = factory.createHandlers(
  rl("vault-envs"),
  instantAuth,
  zValidator("json", envDeleteSchema),
  async (c) => c.json(await deleteEnvironment(c.get("user").id, c.req.valid("json"))),
);
