export const config = { api: { bodyParser: { sizeLimit: "12mb" } } };

const json = (res, status, body) => res.status(status).json(body);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const { prompt, provider = "auto", size = "1024x1024", image } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000)
    return json(res, 400, { error: "Enter a prompt of up to 4,000 characters." });
  if (!["1024x1024", "1024x1536", "1536x1024"].includes(size))
    return json(res, 400, { error: "Unsupported image size." });

  const useXai = (provider === "auto" || provider === "xai") && Boolean(process.env.XAI_API_KEY);
  const useGeneric = (provider === "auto" || provider === "custom") &&
    Boolean(process.env.IMAGE_API_BASE_URL && process.env.IMAGE_API_KEY && process.env.IMAGE_MODEL);
  if (!useXai && !useGeneric)
    return json(res, 503, { error: "No matching provider is configured. Add credentials in Vercel Environment Variables." });

  if (image && (!useXai || typeof image !== "string" || !/^data:image\/(png|jpeg|webp);base64,/i.test(image) || image.length > 10_000_000))
    return json(res, 400, { error: "Image editing requires a supported image under the upload limit and an xAI provider." });

  const isXai = useXai;
  const base = isXai ? "https://api.x.ai/v1" : process.env.IMAGE_API_BASE_URL.replace(/\/+$/, "");
  const model = isXai ? (process.env.XAI_IMAGE_MODEL || "grok-imagine-image-2.0") : process.env.IMAGE_MODEL;
  const endpoint = base + (image ? "/images/edits" : "/images/generations");
  const payload = { model, prompt: prompt.trim() };
  if (image) payload.image = { url: image, type: "image_url" };
  else {
    payload.size = size;
    payload.n = 1;
  }

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Authorization": "Bearer " + (isXai ? process.env.XAI_API_KEY : process.env.IMAGE_API_KEY), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(110000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json(res, upstream.status >= 500 ? 502 : upstream.status, {
      error: data?.error?.message || data?.error || data?.message || "The image provider rejected the request."
    });
    const first = data?.data?.[0];
    if (!first?.url && !first?.b64_json)
      return json(res, 502, { error: data?.error?.message || "Provider response contained no image." });
    return json(res, 200, {
      image: first.url ? { url: first.url } : { base64: first.b64_json, mimeType: first.mime_type || "image/png" },
      provider: isXai ? "xAI · Grok Imagine" : (process.env.IMAGE_PROVIDER_NAME || "Configured provider"),
      revisedPrompt: first.revised_prompt || ""
    });
  } catch (error) {
    return json(res, 502, { error: error?.name === "TimeoutError" ? "Image generation timed out. Try again." : "Could not reach the image provider." });
  }
}
