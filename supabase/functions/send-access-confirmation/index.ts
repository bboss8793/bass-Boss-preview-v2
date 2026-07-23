import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM = "Bass Boss <customerservice@getbassboss.com>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function buildText(firstName: string, orgName: string): string {
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

function buildHtml(firstName: string, orgName: string): string {
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
          <p style="font-size:16px;line-height:1.5;color:#f0e8c8;">Hey ${firstName},</p>
          <p style="font-size:15px;line-height:1.6;color:#f0e8c8;">Thanks for your interest in Bass Boss for <strong style="color:#f0c84a;">${orgName}</strong>. We've received your request and Scott will personally review it — you'll hear back within a couple of days with next steps.</p>
          <p style="font-size:15px;line-height:1.6;color:#f0e8c8;">In the meantime, if you have any questions, just reply to this email.</p>
          <p style="font-size:15px;line-height:1.6;color:#f0e8c8;margin-bottom:24px;">Tight lines,<br><strong style="color:#f0c84a;">The Bass Boss Team</strong><br><a href="https://getbassboss.com" style="color:#c8a030;text-decoration:none;">getbassboss.com</a></p>
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
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY secret is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
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
      text: buildText(firstName, orgName),
      html: buildHtml(firstName, orgName),
      reply_to: "customerservice@getbassboss.com",
    };

    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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
