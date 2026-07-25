import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM = "Bass Boss <customerservice@getbassboss.com>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlPage(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#0a0900;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0900;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111008;border:1px solid #2a2000;border-radius:12px;">
        <tr><td style="padding:28px;text-align:center;">
          <span style="font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#c8a030;">BASS BOSS</span>
        </td></tr>
        <tr><td style="padding:0 28px 28px;">
          ${bodyHtml}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function deniedPage(orgName: string): string {
  return htmlPage("Request Denied", `
    <p style="font-size:22px;font-weight:bold;color:#7a2d2d;margin:0 0 16px;text-align:center;">Denied</p>
    <p style="font-size:16px;line-height:1.6;color:#f0e8c8;text-align:center;">
      Marked <strong style="color:#f0c84a;">${escapeHtml(orgName)}</strong> as denied.
    </p>
    <p style="font-size:13px;color:#6a5a30;text-align:center;margin-top:24px;">
      You can close this page.
    </p>
  `);
}

function alreadyActionedPage(status: string, reviewedAt: string | null): string {
  const when = reviewedAt ? ` on ${new Date(reviewedAt).toLocaleString("en-US")}` : "";
  const verb = status === "approved" ? "approved" : "denied";
  return htmlPage("Already Processed", `
    <p style="font-size:18px;font-weight:bold;color:#c8a030;margin:0 0 16px;text-align:center;">Already ${verb}</p>
    <p style="font-size:15px;line-height:1.6;color:#f0e8c8;text-align:center;">
      This request was already ${verb}${when}. No further action is needed.
    </p>
  `);
}

function errorPage(message: string): string {
  return htmlPage("Error", `
    <p style="font-size:18px;font-weight:bold;color:#7a2d2d;margin:0 0 16px;text-align:center;">Something went wrong</p>
    <p style="font-size:15px;line-height:1.6;color:#f0e8c8;text-align:center;">${escapeHtml(message)}</p>
  `);
}

function invalidLinkPage(): string {
  return htmlPage("Invalid Link", `
    <p style="font-size:18px;font-weight:bold;color:#7a2d2d;margin:0 0 16px;text-align:center;">Invalid Link</p>
    <p style="font-size:15px;line-height:1.6;color:#f0e8c8;text-align:center;">
      This denial link is invalid or has expired. Please check the link in your email and try again.
    </p>
  `);
}

// Draft decline email — left ready but NOT sent automatically.
// Ask Scott before enabling. To enable, uncomment the send block below.
function buildDeclineText(directorName: string, orgName: string): string {
  return [
    `Hey ${directorName},`,
    ``,
    `Thank you for your interest in Bass Boss for ${orgName}. After review, we're not able to approve your request at this time.`,
    ``,
    `We appreciate your interest and encourage you to reach out if you have questions or if your situation changes in the future.`,
    ``,
    `Best regards,`,
    `The Bass Boss Team`,
    `getbassboss.com`,
  ].join("\n");
}

function buildDeclineHtml(directorName: string, orgName: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0900;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0900;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111008;border:1px solid #2a2000;border-radius:12px;">
        <tr><td style="padding:24px 28px 8px;text-align:center;">
          <span style="font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#c8a030;">BASS BOSS</span>
        </td></tr>
        <tr><td style="padding:0 28px 28px;">
          <p style="font-size:16px;line-height:1.5;color:#f0e8c8;">Hey ${escapeHtml(directorName)},</p>
          <p style="font-size:15px;line-height:1.6;color:#f0e8c8;">Thank you for your interest in Bass Boss for <strong style="color:#f0c84a;">${escapeHtml(orgName)}</strong>. After review, we're not able to approve your request at this time.</p>
          <p style="font-size:15px;line-height:1.6;color:#f0e8c8;">We appreciate your interest and encourage you to reach out if you have questions or if your situation changes in the future.</p>
          <p style="font-size:15px;line-height:1.6;color:#f0e8c8;margin-top:24px;">Best regards,<br><strong style="color:#f0c84a;">The Bass Boss Team</strong><br><a href="https://getbassboss.com" style="color:#c8a030;text-decoration:none;">getbassboss.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const token = url.searchParams.get("token");

    if (!id || !token) {
      return new Response(invalidLinkPage(), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    // 1. Look up the request row
    const { data: reqRow, error: lookupErr } = await supabase
      .from("access_requests")
      .select("id, name, email, org_name, status, approval_token, reviewed_at")
      .eq("id", id)
      .maybeSingle();

    if (lookupErr || !reqRow) {
      return new Response(invalidLinkPage(), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 2. Verify token matches
    if (reqRow.approval_token !== token) {
      return new Response(invalidLinkPage(), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 3. Check status — replay protection
    if (reqRow.status !== "pending") {
      return new Response(alreadyActionedPage(reqRow.status, reqRow.reviewed_at), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 4. Update access_requests: status = denied
    const { error: updateErr } = await supabase
      .from("access_requests")
      .update({ status: "denied", reviewed_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) {
      return new Response(errorPage(`Failed to update request: ${updateErr.message}`), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 5. Decline email to requester — DRAFT ONLY, not sent automatically.
    //    Uncomment the block below once Scott confirms he wants auto-decline emails.
    /*
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (apiKey) {
      const firstName = (reqRow.name || "").trim().split(/\s+/)[0] || reqRow.name;
      try {
        await fetch(RESEND_ENDPOINT, {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM,
            to: reqRow.email,
            subject: "Your Bass Boss access request",
            text: buildDeclineText(firstName, reqRow.org_name),
            html: buildDeclineHtml(firstName, reqRow.org_name),
            reply_to: "customerservice@getbassboss.com",
          }),
        });
      } catch (emailErr) {
        console.error("Decline email failed:", emailErr.message);
      }
    }
    */

    // 6. Return confirmation page
    return new Response(deniedPage(reqRow.org_name), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new Response(errorPage(err.message), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
