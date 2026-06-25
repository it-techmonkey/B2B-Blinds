import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const { data, error } = await resend.emails.send({
    from: "Hyde Park Wood <onboarding@resend.dev>",
    to,
    subject: "Reset your password — Hyde Park Wood",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">Reset your password</h2>
        <p style="color:#555;font-size:14px;margin-bottom:24px">
          We received a request to reset the password for your Hyde Park Wood account.
          Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
          Reset password
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
        <p style="color:#ccc;font-size:11px;margin-top:8px">
          Or copy this link: ${resetUrl}
        </p>
      </div>
    `,
  });
  if (error) {
    console.error("[Resend] Failed to send email:", JSON.stringify(error));
    throw new Error(error.message ?? "Failed to send email");
  }
  console.log("[Resend] Email sent:", data?.id);
}
