process.env.NEXT_PUBLIC_INSTANT_APP_ID = "00000000-0000-0000-0000-000000000000";
process.env.INSTANT_ADMIN_TOKEN = "test-admin-token";
process.env.AUTH_JWT_SECRET = "test-cli-jwt-secret-at-least-32-chars-long";
process.env.SECRETS_ENC_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
process.env.CRON_SECRET = "test-cron-secret-16chars";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { deletePasswordEntry, updatePasswordEntry } from "./password.service";

interface TxOp {
  collection: "passwordEntries" | "passwordShares";
  id: string;
  action: "update" | "delete";
  patch?: Record<string, unknown>;
}

const dbMock = vi.hoisted(() => ({
  query: vi.fn(),
  transact: vi.fn(),
}));

vi.mock("../db-admin", () => {
  function txEntity(collection: TxOp["collection"]) {
    return new Proxy<Record<string, unknown>>(
      {},
      {
        get(_target, id: string | symbol) {
          if (typeof id !== "string") return undefined;
          return {
            update: (patch: Record<string, unknown>): TxOp => ({
              collection,
              id,
              action: "update",
              patch,
            }),
            delete: (): TxOp => ({
              collection,
              id,
              action: "delete",
            }),
          };
        },
      },
    );
  }

  return {
    createAdminDb: () => ({
      query: dbMock.query,
      transact: dbMock.transact,
      tx: {
        passwordEntries: txEntity("passwordEntries"),
        passwordShares: txEntity("passwordShares"),
      },
    }),
  };
});

describe("password entry ownership mutations", () => {
  beforeEach(() => {
    dbMock.query.mockReset();
    dbMock.transact.mockReset();
    dbMock.transact.mockResolvedValue(undefined);
  });

  it("updates only an entry owned by the caller", async () => {
    dbMock.query.mockResolvedValue({
      passwordEntries: [
        {
          id: "entry-1",
          owner: { $user: { id: "user-1" } },
          shares: [],
        },
      ],
    });

    await expect(
      updatePasswordEntry("user-1", {
        entryId: "entry-1",
        title: "Updated title",
        username: "",
        encryptedPassword: "ciphertext",
      }),
    ).resolves.toEqual({ ok: true });

    const op = dbMock.transact.mock.calls[0]?.[0] as TxOp;
    expect(op).toMatchObject({
      collection: "passwordEntries",
      id: "entry-1",
      action: "update",
      patch: {
        title: "Updated title",
        username: "",
        encryptedPassword: "ciphertext",
        updatedAt: expect.any(Number),
      },
    });
    expect(op.patch).not.toHaveProperty("notes");
  });

  it("rejects updates for entries owned by another user", async () => {
    dbMock.query.mockResolvedValue({
      passwordEntries: [
        {
          id: "entry-1",
          owner: { $user: { id: "user-2" } },
          shares: [],
        },
      ],
    });

    await expect(
      updatePasswordEntry("user-1", {
        entryId: "entry-1",
        title: "Updated title",
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(dbMock.transact).not.toHaveBeenCalled();
  });

  it("deletes an owned entry after deleting its shares", async () => {
    dbMock.query.mockResolvedValue({
      passwordEntries: [
        {
          id: "entry-1",
          owner: [{ $user: [{ id: "user-1" }] }],
          shares: [{ id: "share-1" }, { id: "share-2" }],
        },
      ],
    });

    await expect(deletePasswordEntry("user-1", "entry-1")).resolves.toEqual({ ok: true });

    expect(dbMock.transact).toHaveBeenCalledWith([
      { collection: "passwordShares", id: "share-1", action: "delete" },
      { collection: "passwordShares", id: "share-2", action: "delete" },
      { collection: "passwordEntries", id: "entry-1", action: "delete" },
    ]);
  });
});
