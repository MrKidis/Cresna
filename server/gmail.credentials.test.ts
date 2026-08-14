import nodemailer from "nodemailer";
import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";

describe("Gmail SMTP credentials", () => {
  it("authenticates the configured Cresna sender without sending a message", async () => {
    expect(ENV.gmailSmtpUser).toContain("@");
    expect(ENV.gmailSmtpAppPassword.replace(/\s+/g, "").length).toBeGreaterThanOrEqual(16);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: ENV.gmailSmtpUser, pass: ENV.gmailSmtpAppPassword.replace(/\s+/g, "") },
    });
    await expect(transporter.verify()).resolves.toBe(true);
  }, 20_000);
});
