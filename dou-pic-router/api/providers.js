export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const xaiReady = Boolean(process.env.XAI_API_KEY);
  const genericReady = Boolean(process.env.IMAGE_API_BASE_URL && process.env.IMAGE_API_KEY && process.env.IMAGE_MODEL);
  const providers = [];
  if (xaiReady) providers.push({
    id: "xai",
    name: "xAI · Grok Imagine",
    configured: true,
    pricing: "Paid API; check current xAI pricing and account limits",
    capabilities: ["text-to-image", "image-editing"],
    automatic: true
  });
  if (genericReady) providers.push({
    id: "custom",
    name: process.env.IMAGE_PROVIDER_NAME || "Custom OpenAI-compatible provider",
    configured: true,
    pricing: "Check provider pricing and quotas",
    capabilities: ["text-to-image"],
    automatic: true
  });
  return res.status(200).json({
    providers,
    message: providers.length ? "Configured providers are ready." : "No provider credentials configured. Add XAI_API_KEY or the generic IMAGE_API_* variables in Vercel."
  });
}
