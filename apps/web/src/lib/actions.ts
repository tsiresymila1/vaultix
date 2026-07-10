"use server";

import { createAdminDb } from "@/lib/db-admin";
import { serverEnv } from "@/lib/env";

export async function sendVaultInvitation({
  instantToken,
  vaultName,
  inviteeEmail,
  role,
}: {
  instantToken: string;
  vaultName: string;
  inviteeEmail: string;
  role: string;
}) {
  try {
    const db = createAdminDb();
    const inviter = await db.auth.verifyToken(instantToken).catch(() => null);
    if (!inviter?.email) {
      return { success: false, error: "Unauthorized" };
    }

    const { RESEND_API_KEY } = serverEnv();
    if (!RESEND_API_KEY) {
      // No email provider configured — the membership is still created client-side;
      // this only skips the courtesy notification.
      console.info(
        `[invitation] ${inviter.email} → ${inviteeEmail} for vault "${vaultName}" (${role}); RESEND_API_KEY unset, email skipped`,
      );
      return { success: true, emailed: false };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Vaultix <invitations@vaultix-secure.vercel.app>",
        to: inviteeEmail,
        subject: `You've been invited to join ${vaultName}`,
        html: `<p>${inviter.email} invited you to join the vault <strong>${vaultName}</strong> as a <strong>${role}</strong>.</p><p>Sign in at Vaultix to accept.</p>`,
      }),
    });

    if (!res.ok) {
      return { success: false, error: "Failed to send invitation email" };
    }
    return { success: true, emailed: true };
  } catch (error) {
    console.error("Invitation action error:", error);
    return { success: false, error: "Internal Server Error" };
  }
}
