export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, provider = "auto", size = "1024x1024" } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000) {
    return res.status(400).json({ error: "Enter a prompt of up to 4,000 characters." });
  }
  if (!process.env.IMAGE_API_BASE_URL || !process.env.IMAGE_API_KEY || !process.env.IMAGE_MODEL) {
    return res.status(503).json({ error: "No image provider is configured. Add an official provider's credentials in Vercel Environment Variables." });
  }
  if (provider !== "auto" && provider !== "official-configured") {
    return res.status(400).json({ error: "The selected provider is not configured." });
  }

  const base = process.env.IMAGE_API_BASE_URL.replace(/\/+$/, "");
  try {
    const upstream = await fetch(base + "/images/generations", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.IMAGE_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.IMAGE_MODEL,
        prompt: prompt.trim(),
        size,
        n: 1
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({
        error: data?.error?.message || data?.message || "The image provider rejected the request."
      });
    }
    const first = data?.data?.[0];
    if (!first?.url && !first?.b64_json) {
      return res.status(502).json({ error: "Provider response did not contain an image URL or base64 image." });
    }
    return res.status(200).json({ image: first.url ? { url: first.url } : { base64: first.b64_json }, provider: process.env.IMAGE_PROVIDER_NAME || "Configured image provider" });
  } catch {
    return res.status(502).json({ error: "Could not reach the configured image provider." });
  }
}
