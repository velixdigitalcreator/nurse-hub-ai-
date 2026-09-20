// netlify/functions/claude-proxy.js
//
// Classic Netlify Functions format — works reliably at the default URL:
// /.netlify/functions/claude-proxy
//
// Reads the real Anthropic API key from Netlify's environment variables
// (Site configuration > Environment variables > ANTHROPIC_API_KEY) and
// forwards the request. The app's front-end calls THIS function, never
// api.anthropic.com directly — so the real key is never exposed.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server is not configured with an Anthropic API key yet." }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
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

    return {
      statusCode: anthropicResponse.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Something went wrong processing that request: " + err.message }),
    };
  }
};
