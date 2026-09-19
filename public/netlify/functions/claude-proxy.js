// netlify/functions/claude-proxy.js
//
// This runs on Netlify's server, never in the student's browser.
// It reads the real Anthropic API key from Netlify's environment variables
// (set in Site settings > Environment variables as ANTHROPIC_API_KEY)
// and forwards the request. The app's front-end code calls THIS function,
// never api.anthropic.com directly — so the real key is never exposed.

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server is not configured with an Anthropic API key yet." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();

    // Basic safety limit so one request can't run away with cost
    const maxTokens = Math.min(body.max_tokens || 1000, 1500);

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model || "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system: body.system,
        messages: body.messages,
      }),
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: anthropicResponse.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Something went wrong processing that request." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = {
  path: "/api/claude",
};
