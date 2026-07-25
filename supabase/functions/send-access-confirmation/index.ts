import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM = "Bass Boss <customerservice@getbassboss.com>";
const SCOTT_EMAIL = "scott.gros@yahoo.com";
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const BASE_URL = "https://getbassboss.com";

function edgeFunctionUrl(slug: string): string {
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  return `${supabaseUrl}/functions/v1/${slug}`;
}

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

function buildSubmitterText(firstName: string, orgName: string): string {
  return [
    `Hey ${firstName},`,
    ``,
    `Thanks for your interest in Bass Boss for ${orgName}. We've received your request and Scott will personally review it — you'll hear back within a couple of days with next steps.`,
    ``,
    `In the meantime, if you have any questions, just reply to this email.`,
    ``,
    `Tight lines,`,
    `The Bass Boss Team`,
    `getbassboss.com`,
  ].join("\n");
}

function buildSubmitterHtml(firstName: string, orgName: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0900;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0900;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111008;border:1px solid #2a2000;border-radius:12px;">
        <tr><td style="padding:24px 28px 8px;text-align:center;">
          <span style="font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#c8a030;">BASS BOSS</span>
        </td></tr>
        <tr><td style="padding:0 28px 24px;">
          <p style="font-size:16px;line-height:1.5;color:#f0e8c8;">Hey ${escapeHtml(firstName)},</p>
          <p style="font-size:15px;line-height:1.6;color:#f0e8c8;">Thanks for your interest in Bass Boss for <strong style="color:#f0c84a;">${escapeHtml(orgName)}</strong>. We've received your request and Scott will personally review it — you'll hear back within a couple of days with next steps.</p>
          <p style="font-size:15px;line-height:1.6;color:#f0e8c8;">In the meantime, if you have any questions, just reply to this email.</p>
          <p style="font-size:15px;line-height:1.6;color:#f0e8c8;margin-bottom:24px;">Tight lines,<br><strong style="color:#f0c84a;">The Bass Boss Team</strong><br><a href="${BASE_URL}" style="color:#c8a030;text-decoration:none;">getbassboss.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildScottText(r: Record<string, unknown>): string {
  const approveUrl = `${edgeFunctionUrl("approve-request")}?id=${r.id}&token=${r.approval_token}`;
  const denyUrl = `${edgeFunctionUrl("deny-request")}?id=${r.id}&token=${r.approval_token}`;
  return [
    `New Bass Boss access request received.`,
    ``,
    `Organization: ${r.org_name}`,
    `Type: ${r.org_type}`,
    `Contact: ${r.name} <${r.email}>`,
    `Phone: ${r.phone || "—"}`,
    `Members: ${r.member_count}`,
    `Location: ${r.location}`,
    `Tournament info: ${r.tournament_info || "—"}`,
    ``,
    `Approve: ${approveUrl}`,
    `Deny: ${denyUrl}`,
  ].join("\n");
}

function buildScottHtml(r: Record<string, unknown>): string {
  const approveUrl = `${edgeFunctionUrl("approve-request")}?id=${r.id}&token=${r.approval_token}`;
  const denyUrl = `${edgeFunctionUrl("deny-request")}?id=${r.id}&token=${r.approval_token}`;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 0;font-size:14px;color:#8a7a40;width:120px;vertical-align:top;">${label}</td><td style="padding:4px 0;font-size:14px;color:#f0e8c8;">${escapeHtml(value)}</td></tr>`;
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0900;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0900;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#111008;border:1px solid #2a2000;border-radius:12px;">
        <tr><td style="padding:24px 28px 8px;text-align:center;">
          <span style="font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#c8a030;">BASS BOSS</span>
        </td></tr>
        <tr><td style="padding:0 28px 8px;">
          <p style="font-size:16px;font-weight:bold;color:#f0c84a;margin:0 0 16px;">New Access Request</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
            ${row("Organization", String(r.org_name))}
            ${row("Type", String(r.org_type))}
            ${row("Contact", `${r.name} <${r.email}>`)}
            ${row("Phone", String(r.phone || "—"))}
            ${row("Members", String(r.member_count))}
            ${row("Location", String(r.location))}
            ${row("Tournament", String(r.tournament_info || "—"))}
          </table>
          <p style="font-size:15px;color:#f0e8c8;margin:0 0 16px;">Review and take action:</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
            <tr>
              <td style="padding:0 4px 8px 0;width:50%;">
                <a href="${approveUrl}" style="display:block;text-align:center;padding:14px 20px;background:#2d7a3d;color:#fff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:8px;">Approve</a>
              </td>
              <td style="padding:0 0 8px 4px;width:50%;">
                <a href="${denyUrl}" style="display:block;text-align:center;padding:14px 20px;background:#7a2d2d;color:#fff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:8px;">Deny</a>
              </td>
            </tr>
          </table>
          <p style="font-size:12px;color:#6a5a30;margin:0;line-height:1.5;">If the buttons don't work, copy these links:<br>Approve: ${approveUrl}<br>Deny: ${denyUrl}</p>
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
    const apiKey = await getResendApiKey();

    const body = await req.json();

    // ── Scott notification path (triggered by DB trigger on new request) ──
    if (body?.notify_scott) {
      const r: Record<string, unknown> = body;
      const required = ["id", "approval_token", "name", "email", "org_type", "org_name", "member_count", "location"];
      for (const f of required) {
        if (!r[f]) {
          return new Response(
            JSON.stringify({ error: `Missing field for Scott notification: ${f}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      const payload = {
        from: FROM,
        to: SCOTT_EMAIL,
        subject: `New Bass Boss access request: ${r.org_name}`,
        text: buildScottText(r),
        html: buildScottHtml(r),
        reply_to: "customerservice@getbassboss.com",
      };

      const res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ error: `Resend API error (${res.status}): ${errText}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const data = await res.json();
      return new Response(
        JSON.stringify({ success: true, id: data.id, sent: "scott" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Submitter confirmation path (original behavior) ──────────────────
    const email: string | undefined = body?.email;
    const name: string | undefined = body?.name;
    const orgName: string | undefined = body?.org_name;

    if (!email || !name || !orgName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, name, org_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const firstName = name.trim().split(/\s+/)[0] || name;

    const payload = {
      from: FROM,
      to: email,
      subject: "We've got your Bass Boss request",
      text: buildSubmitterText(firstName, orgName),
      html: buildSubmitterHtml(firstName, orgName),
      reply_to: "customerservice@getbassboss.com",
    };

    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: `Resend API error (${res.status}): ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
