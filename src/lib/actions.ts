"use server";

import { createClient } from "@/utils/supabase/server";

export async function sendVaultInvitation({
    vaultName,
    inviteeEmail,
    role,
    inviterEmail,
}: {
    vaultName: string;
    inviteeEmail: string;
    role: string;
    inviterEmail: string | undefined;
}) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            throw new Error("Unauthorized");
        }

        // 1. Log the invitation
        console.log(`[SERVER ACTION] Invitation From: ${inviterEmail} To: ${inviteeEmail} Vault: ${vaultName} Role: ${role}`);

        // 2. Mock sending email
        // In production, integrate with Resend/SendGrid/etc.
        /*
        await resend.emails.send({
            from: 'Vaultix <invitations@vaultix.io>',
            to: inviteeEmail,
            subject: `You've been invited to join ${vaultName}`,
            html: `<p>${inviterEmail} has invited you to join the vault <strong>${vaultName}</strong> as a <strong>${role}</strong>.</p>`
        });
        */

        return { success: true };
    } catch (error) {
        console.error("Invitation action error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Internal Server Error" };
    }
}
