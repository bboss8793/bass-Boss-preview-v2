import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM = "Bass Boss <customerservice@getbassboss.com>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const APP_BASE = "https://getbassboss.com";

async function getResendApiKey(): Promise<string> {
  const envKey = Deno.env.get("RESEND_API_KEY");
  if (envKey) return envKey;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("RESEND_API_KEY not set and SUPABASE_URL/SERVICE_ROLE_KEY unavailable to read it from private_config");
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/private_config?select=value&key=eq.resend_api_key`, {
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to read resend_api_key from private_config: ${res.status}`);
  }
  const rows = await res.json() as Array<{ value: string }>;
  if (!rows.length || !rows[0].value) {
    throw new Error("resend_api_key not found in private_config");
  }
  return rows[0].value;
}

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

function approvedPage(orgName: string, orgCode: string, directorName: string): string {
  return htmlPage("Request Approved", `
    <p style="font-size:22px;font-weight:bold;color:#2d7a3d;margin:0 0 16px;text-align:center;">Approved</p>
    <p style="font-size:16px;line-height:1.6;color:#f0e8c8;text-align:center;">
      <strong style="color:#f0c84a;">${escapeHtml(orgName)}</strong> has been approved.
    </p>
    <p style="font-size:15px;line-height:1.6;color:#f0e8c8;text-align:center;margin-top:16px;">
      Org code <strong style="font-family:monospace;font-size:18px;color:#f0c84a;letter-spacing:2px;">${escapeHtml(orgCode)}</strong> has been emailed to ${escapeHtml(directorName)}.
    </p>
    <p style="font-size:13px;color:#6a5a30;text-align:center;margin-top:24px;">
      You can close this page. The director received a welcome email with instructions.
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
      This approval link is invalid or has expired. Please check the link in your email and try again.
    </p>
  `);
}

function generateOrgCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function buildWelcomeText(directorName: string, orgName: string, orgCode: string, setupLink: string): string {
  return [
    `Hey ${directorName},`,
    ``,
    `Great news — your Bass Boss access request for ${orgName} has been approved!`,
    ``,
    `There are two sides to your account — yours and your members'. Here's how each works:`,
    ``,
    `— FOR YOU (the director) —`,
    `We created your director account using ${orgName}'s email on file. Before you can sign in, you need to set a password:`,
    `1. Click this link to set your password: ${setupLink}`,
    `2. After setting your password, go to ${APP_BASE}`,
    `3. Click "Are you a Director? Sign In" on the join screen`,
    `4. Sign in with your email and new password`,
    `5. You'll see your Director dashboard with tools to manage tournaments, boats, and your roster`,
    ``,
    `— FOR YOUR MEMBERS (anglers) —`,
    `Your organization code is: ${orgCode}`,
    `Share this code with your members. They do NOT need a password or account — they just:`,
    `1. Go to ${APP_BASE}`,
    `2. Enter the code ${orgCode} on the join screen`,
    `3. Type their name and they're in`,
    ``,
    `The org code is for your members only. You sign in with your email and password — don't enter the org code yourself.`,
    ``,
    `Welcome aboard,`,
    `The Bass Boss Team`,
    `getbassboss.com`,
  ].join("\n");
}

function buildWelcomeHtml(directorName: string, orgName: string, orgCode: string, setupLink: string): string {
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
          <p style="font-size:15px;line-height:1.6;color:#f0e8c8;">Great news — your Bass Boss access request for <strong style="color:#f0c84a;">${escapeHtml(orgName)}</strong> has been approved!</p>
          <p style="font-size:15px;line-height:1.6;color:#f0e8c8;">There are two sides to your account — yours and your members'. Here's how each works:</p>

          <!-- Director section -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;margin-bottom:8px;">
            <tr><td style="background:#1a1a0a;border:1px solid #c8a030;border-radius:8px;padding:16px 20px;">
              <p style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#c8a030;margin:0 0 10px;">For You (Director)</p>
              <p style="font-size:14px;line-height:1.6;color:#f0e8c8;margin:0 0 12px;">We created your director account. Before you can sign in, set your password:</p>
              <p style="text-align:center;margin:0 0 14px;">
                <a href="${escapeHtml(setupLink)}" style="display:inline-block;padding:12px 28px;background:#c8a030;border-radius:6px;font-size:14px;font-weight:bold;color:#0a0900;text-decoration:none;">Set Your Password</a>
              </p>
              <p style="font-size:13px;line-height:1.6;color:#8a7a40;margin:0 0 6px;">Then:</p>
              <ol style="font-size:14px;line-height:1.7;color:#f0e8c8;padding-left:20px;margin:0;">
                <li>Go to <a href="${APP_BASE}" style="color:#c8a030;text-decoration:none;">${APP_BASE}</a></li>
                <li>Click <strong style="color:#f0c84a;">"Are you a Director? Sign In"</strong> on the join screen</li>
                <li>Sign in with your email and new password</li>
                <li>You'll see your Director dashboard to manage tournaments, boats, and roster</li>
              </ol>
            </td></tr>
          </table>

          <!-- Members section -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;margin-bottom:8px;">
            <tr><td style="background:#0f0f08;border:1px solid #2a2000;border-radius:8px;padding:16px 20px;">
              <p style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#a08040;margin:0 0 10px;">For Your Members (Anglers)</p>
              <p style="font-size:14px;line-height:1.6;color:#f0e8c8;margin:0 0 8px;">Your organization code is:</p>
              <p style="text-align:center;margin:4px 0 14px;">
                <span style="display:inline-block;padding:10px 28px;background:#1a1a0a;border:2px solid #c8a030;border-radius:8px;font-family:monospace;font-size:22px;font-weight:bold;color:#f0c84a;letter-spacing:4px;">${escapeHtml(orgCode)}</span>
              </p>
              <p style="font-size:13px;line-height:1.6;color:#8a7a40;margin:0 0 6px;">Share this code with your members. They don't need a password or account — they just:</p>
              <ol style="font-size:14px;line-height:1.7;color:#f0e8c8;padding-left:20px;margin:0;">
                <li>Go to <a href="${APP_BASE}" style="color:#c8a030;text-decoration:none;">${APP_BASE}</a></li>
                <li>Enter the code <strong style="font-family:monospace;color:#f0c84a;">${escapeHtml(orgCode)}</strong> on the join screen</li>
                <li>Type their name and they're in</li>
              </ol>
            </td></tr>
          </table>

          <p style="font-size:13px;line-height:1.6;color:#8a7a40;margin:16px 0 20px;border-top:1px solid #2a2000;padding-top:16px;">
            <strong style="color:#c8a030;">Important:</strong> The org code is for your members only. You sign in with your email and password — don't enter the org code yourself.
          </p>

          <p style="font-size:15px;line-height:1.6;color:#f0e8c8;">Welcome aboard,<br><strong style="color:#f0c84a;">The Bass Boss Team</strong><br><a href="${APP_BASE}" style="color:#c8a030;text-decoration:none;">getbassboss.com</a></p>
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, anonKey);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Look up the request row
    const { data: reqRow, error: lookupErr } = await supabase
      .from("access_requests")
      .select("id, name, email, phone, org_type, org_name, status, approval_token, reviewed_at")
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

    // 4. Generate unique org_code (collision-checked against teams.org_code)
    let orgCode = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateOrgCode();
      const { data: existing } = await supabase
        .from("teams")
        .select("id")
        .eq("org_code", candidate)
        .maybeSingle();
      if (!existing) {
        orgCode = candidate;
        break;
      }
    }
    if (!orgCode) {
      return new Response(errorPage("Could not generate a unique org code. Please try again."), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 5. Insert the new team/org row
    const { error: insertErr } = await supabase
      .from("teams")
      .insert({
        name: reqRow.org_name,
        org_code: orgCode,
        org_type: reqRow.org_type,
        director_name: reqRow.name,
        director_email: reqRow.email,
        director_phone: reqRow.phone,
        status: "active",
      });

    if (insertErr) {
      return new Response(errorPage(`Failed to create organization: ${insertErr.message}`), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 6. Create the director's auth account + generate a password-setup link.
    //    The admin createUser call creates the user without a password; the
    //    recovery link lets the director set one themselves.
    let setupLink = `${APP_BASE}/login`;
    try {
      const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: reqRow.email,
        email_confirm: true,
        user_metadata: { name: reqRow.name, org_name: reqRow.org_name },
      });

      if (createErr) {
        // If the user already exists (duplicate email), that's fine — they may
        // have registered previously. Generate a recovery link for them instead.
        console.error("admin.createUser error:", createErr.message);
      }

      const userId = createdUser?.user?.id;

      // Generate a recovery/password-setup link for this user
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: reqRow.email,
      });

      if (linkErr) {
        console.error("generateLink error:", linkErr.message);
      } else if (linkData?.properties?.action_link) {
        setupLink = linkData.properties.action_link;
      }
    } catch (authErr) {
      console.error("Auth user creation failed:", authErr.message);
    }

    // 7. Update the access_requests row
    const { error: updateErr } = await supabase
      .from("access_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) {
      console.error("Failed to update access_requests status:", updateErr.message);
    }

    // 8. Send welcome email to the director
    try {
      const apiKey = await getResendApiKey();
      const firstName = (reqRow.name || "").trim().split(/\s+/)[0] || reqRow.name;
      try {
        const emailRes = await fetch(RESEND_ENDPOINT, {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM,
            to: reqRow.email,
            subject: `You're approved — welcome to Bass Boss, ${firstName}!`,
            text: buildWelcomeText(firstName, reqRow.org_name, orgCode, setupLink),
            html: buildWelcomeHtml(firstName, reqRow.org_name, orgCode, setupLink),
            reply_to: "customerservice@getbassboss.com",
          }),
        });
        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error(`Welcome email Resend API error (${emailRes.status}): ${errText}`);
        }
      } catch (emailErr) {
        console.error("Welcome email failed:", emailErr.message);
      }
    } catch (keyErr) {
      console.error("Could not obtain Resend API key for welcome email:", keyErr.message);
    }

    // 9. Return confirmation page
    return new Response(approvedPage(reqRow.org_name, orgCode, reqRow.name), {
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
