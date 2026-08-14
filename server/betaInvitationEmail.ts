import nodemailer from "nodemailer";
import { ENV } from "./_core/env";
import { createFoundingBetaInvite, setFoundingBetaInviteDelivery } from "./db";

export function getGmailDeliveryConfiguration() {
  const sender = ENV.gmailSmtpUser.trim();
  const appPassword = ENV.gmailSmtpAppPassword.replace(/\s+/g, "");
  return { isConfigured: Boolean(sender && appPassword), sender, appPassword };
}

export function buildBetaInvitationMessage(input: { recipient: string; invitationUrl: string }) {
  const subject = "You’re invited to Cresna Founding Beta";
  const text = `You have been invited to try Cresna Founding Beta. Your invitation activates seven days of full access after you sign in with this email address.\n\nOpen Cresna: ${input.invitationUrl}\n\nCresna uses store data only after you approve its Shopify connection. You can ignore this email if you were not expecting an invitation.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#17201e"><p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#65706b">Cresna Founding Beta</p><h1 style="font-size:28px;line-height:1.15">You’re invited to build better growth decisions.</h1><p>You have been invited to try Cresna Founding Beta. Your invitation activates seven days of full access after you sign in with this email address.</p><p style="margin:28px 0"><a href="${input.invitationUrl}" style="display:inline-block;background:#17201e;color:#f8f7f2;padding:13px 20px;border-radius:999px;text-decoration:none;font-weight:700">Open Cresna</a></p><p style="color:#65706b;font-size:13px;line-height:1.5">Cresna uses Shopify data only after you approve the connection. If you were not expecting this invitation, you can safely ignore this email.</p></div>`;
  return { subject, text, html };
}

export async function createAndDeliverBetaInvite(input: { ownerUserId: number; email: string; invitationUrl: string }) {
  const invite = await createFoundingBetaInvite(input.ownerUserId, input.email);
  const config = getGmailDeliveryConfiguration();
  if (!config.isConfigured) {
    await setFoundingBetaInviteDelivery({ inviteId: invite.id, status: "unconfigured", error: "Gmail sender has not been configured." });
    return { ...invite, deliveryStatus: "unconfigured" as const, deliveryError: "Gmail sender has not been configured." };
  }
  try {
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: config.sender, pass: config.appPassword } });
    const message = buildBetaInvitationMessage({ recipient: invite.email, invitationUrl: input.invitationUrl });
    const result = await transporter.sendMail({ from: `Cresna <${config.sender}>`, to: invite.email, ...message });
    await setFoundingBetaInviteDelivery({ inviteId: invite.id, status: "sent", messageId: result.messageId });
    return { ...invite, deliveryStatus: "sent" as const, deliveryMessageId: result.messageId, deliveredAt: new Date() };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message.slice(0, 1000) : "Gmail could not send this invitation.";
    await setFoundingBetaInviteDelivery({ inviteId: invite.id, status: "failed", error: errorMessage });
    return { ...invite, deliveryStatus: "failed" as const, deliveryError: errorMessage };
  }
}
