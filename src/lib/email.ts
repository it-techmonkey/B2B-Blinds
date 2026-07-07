import { Resend } from "resend";
import { SITE_BRAND, COMPANY_LETTERHEAD } from "@/lib/site";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `${SITE_BRAND} <noreply@hydeparkwood.co.uk>`;

function renderEmailLayout(opts: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footnote?: string;
}): string {
  const { preheader, heading, bodyHtml, cta, footnote } = opts;
  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
    <div style="background:#f4f5f7;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
        <tr>
          <td style="padding:0 8px 24px">
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:600;letter-spacing:-0.01em;color:#171b23">
              ${SITE_BRAND}
            </span>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:36px 32px">
            <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;font-weight:650;color:#171b23">${heading}</h1>
            ${bodyHtml}
            ${
              cta
                ? `<a href="${cta.url}"
                     style="display:inline-block;margin-top:8px;background:#171b23;color:#ffffff;text-decoration:none;
                            padding:13px 26px;border-radius:9px;font-size:14px;font-weight:600">
                     ${cta.label}
                   </a>`
                : ""
            }
            ${
              footnote
                ? `<p style="margin:20px 0 0;font-size:11px;line-height:1.6;color:#b3b8c2">${footnote}</p>`
                : ""
            }
          </td>
        </tr>
        <tr>
          <td style="padding:24px 8px 0;color:#9aa0ab;font-size:12px;line-height:1.6">
            ${SITE_BRAND}${COMPANY_LETTERHEAD.addressLines.length ? " · " + COMPANY_LETTERHEAD.addressLines.join(", ") : ""}<br />
            This is an automated message — please don't reply directly to this email.
          </td>
        </tr>
      </table>
    </div>
  `;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = renderEmailLayout({
    preheader: "Reset the password for your Hyde Park Wood account.",
    heading: "Reset your password",
    bodyHtml: `
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#4b5563">
        We received a request to reset the password for your ${SITE_BRAND} account.
        Click the button below to choose a new password. For your security, this link expires in <strong>1 hour</strong>.
      </p>
    `,
    cta: { label: "Reset password", url: resetUrl },
    footnote: `If the button doesn't work, copy and paste this link into your browser: ${resetUrl}`,
  });

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Reset your password — ${SITE_BRAND}`,
    html,
  });
  if (error) {
    console.error("[Resend] Failed to send email:", JSON.stringify(error));
    throw new Error(error.message ?? "Failed to send email");
  }
  console.log("[Resend] Email sent:", data?.id);
}

export type PricingUpdateSummary = {
  discount: string | null;
  overrides: { productName: string; size: string; price: string }[];
  blockedProductNames: string[];
};

export async function sendPricingUpdatedEmail(to: string, name: string, summary: PricingUpdateSummary) {
  const rows: string[] = [];
  if (summary.discount) {
    rows.push(
      `<tr><td style="padding:10px 0;border-bottom:1px solid #eef0f3;font-size:14px;color:#4b5563">Account-wide discount</td>
           <td style="padding:10px 0;border-bottom:1px solid #eef0f3;font-size:14px;font-weight:600;color:#171b23;text-align:right">${summary.discount}% off list price</td></tr>`
    );
  }
  for (const o of summary.overrides) {
    rows.push(
      `<tr><td style="padding:10px 0;border-bottom:1px solid #eef0f3;font-size:14px;color:#4b5563">${o.productName} (${o.size})</td>
           <td style="padding:10px 0;border-bottom:1px solid #eef0f3;font-size:14px;font-weight:600;color:#171b23;text-align:right">$${o.price}</td></tr>`
    );
  }
  for (const productName of summary.blockedProductNames) {
    rows.push(
      `<tr><td style="padding:10px 0;border-bottom:1px solid #eef0f3;font-size:14px;color:#4b5563">${productName}</td>
           <td style="padding:10px 0;border-bottom:1px solid #eef0f3;font-size:13px;font-weight:600;color:#a34a3d;text-align:right">No longer available</td></tr>`
    );
  }

  const tableHtml =
    rows.length > 0
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">${rows.join("")}</table>`
      : `<p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#4b5563">Your account has been reset to standard list pricing.</p>`;

  const html = renderEmailLayout({
    preheader: `Your ${SITE_BRAND} account pricing has been updated.`,
    heading: `Hi ${name}, your pricing has been updated`,
    bodyHtml: `
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4b5563">
        An administrator at ${SITE_BRAND} has made the following change${rows.length === 1 ? "" : "s"} to the pricing on your account:
      </p>
      ${tableHtml}
      <p style="margin:0;font-size:13px;line-height:1.6;color:#9aa0ab">
        Sign in to your account at any time to review your current pricing in full.
      </p>
    `,
  });

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Your pricing has been updated — ${SITE_BRAND}`,
    html,
  });
  if (error) {
    console.error("[Resend] Failed to send pricing update email:", JSON.stringify(error));
    throw new Error(error.message ?? "Failed to send email");
  }
  console.log("[Resend] Pricing update email sent:", data?.id);
}
