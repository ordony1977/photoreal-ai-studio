export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const configured = Boolean(process.env.IMAGE_API_BASE_URL && process.env.IMAGE_API_KEY && process.env.IMAGE_MODEL);
  return res.status(200).json({
    providers: configured ? [{
      id: "official-configured",
      name: process.env.IMAGE_PROVIDER_NAME || "Configured image provider",
      configured: true,
      availability: "configured",
      pricing: "Check the provider's official pricing and quota",
      capabilities: ["text-to-image"],
      automatic: true
    }] : [],
    message: configured
      ? "A server-side provider is configured. Pricing and free-tier eligibility must be checked with its official provider."
      : "No provider is configured yet. Add official provider credentials as server-side environment variables."
  });
}
