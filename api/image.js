
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { key, prompt, model = "grok-imagine-image", count = 1, aspect_ratio = "1:1", image } = req.body || {};

    if (!key || !prompt) {
      return res.status(400).json({ error: "API key and prompt are required" });
    }

    const isEdit = Boolean(image);
    const endpoint = isEdit
      ? "https://api.x.ai/v1/images/edits"
      : "https://api.x.ai/v1/images/generations";

    const payload = {
      model,
      prompt,
      n: Math.min(4, Math.max(1, Number(count) || 1)),
      response_format: "url"
    };

    if (isEdit) {
      payload.image = { url: image };
    } else {
      payload.aspect_ratio = aspect_ratio;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    return res.status(500).json({
      error: "Image generation request failed"
    });
  }
}