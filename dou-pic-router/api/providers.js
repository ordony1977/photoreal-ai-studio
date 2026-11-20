export default function handler(req, res) {
  res.setHeader("Cache-Control","no-store"); res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  const providers=[];
  if(process.env.CF_ACCOUNT_ID&&process.env.CF_API_TOKEN) providers.push({id:"cloudflare",name:"Cloudflare Workers AI · FLUX Schnell",configured:true,pricing:"10,000 Neurons/day free allocation; resets at 00:00 UTC",capabilities:["text-to-image"],automatic:true});
  if(process.env.OVH_IMAGE_ENDPOINT_URL) providers.push({id:"ovh",name:"OVHcloud AI Endpoints · configured model",configured:true,pricing:"Check selected model billing; anonymous access limited to 2 requests/minute/IP/model",capabilities:["text-to-image"],automatic:true});
  if(process.env.XAI_API_KEY) providers.push({id:"xai",name:"xAI · Grok Imagine",configured:true,pricing:"Paid API; check current pricing",capabilities:["text-to-image","image-editing"],automatic:true});
  if(process.env.IMAGE_API_BASE_URL&&process.env.IMAGE_API_KEY&&process.env.IMAGE_MODEL) providers.push({id:"custom",name:process.env.IMAGE_PROVIDER_NAME||"Custom provider",configured:true,pricing:"Check provider pricing and quotas",capabilities:["text-to-image"],automatic:true});
  return res.status(200).json({providers,message:"Provider availability and quotas are controlled by each provider."});
}