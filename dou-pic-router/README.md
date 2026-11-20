# Dou-Pic-Router

A standalone, mobile-first AI image studio with Arabic/English UI, RTL/LTR layout, automatic/manual provider routing, and server-side secret handling.

## Deploy
Set the Vercel project Root Directory to `dou-pic-router`. The project uses Vercel Node serverless functions in `api/` and a static `index.html`.

## Provider configuration
The app intentionally does not scrape GitHub or harvest API keys. Configure an official provider's credentials as server-side Vercel environment variables. Initial adapter: OpenAI-compatible image generation endpoint.

Environment variables:
- `IMAGE_API_BASE_URL`: provider API base URL (for example, an official OpenAI-compatible API base).
- `IMAGE_API_KEY`: provider key, stored only in Vercel Environment Variables.
- `IMAGE_MODEL`: image model identifier.
- `IMAGE_PROVIDER_NAME`: display name for the configured provider.

The provider is shown as configured only when all required variables exist. "Free" is never assumed; provider pricing and quotas must be verified from its official documentation.

## Local preview
This is a Vercel serverless project. Use `vercel dev` from this directory after installing the Vercel CLI.

## Security
Secrets are never returned by API routes or embedded in browser code. Do not commit API keys.
