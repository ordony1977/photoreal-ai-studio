export const config = { api: { bodyParser: { sizeLimit: "12mb" } } };
const json = (res, status, body) => res.status(status).json(body);
const isImage = x => typeof x === "string" && /^data:image\/(png|jpeg|webp);base64,/i.test(x) && x.length <= 10_000_000;

async function callCloudflare(prompt, size) {
  const model = process.env.CF_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";
  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/${model}`;
  const r = await fetch(url, { method:"POST", headers:{Authorization:"Bearer "+process.env.CF_API_TOKEN,"Content-Type":"application/json"}, body:JSON.stringify({prompt,width:size==="1024x1536"?768:size==="1536x1024"?1024:1024,height:size==="1024x1536"?1024:size==="1536x1024"?768:1024}), signal:AbortSignal.timeout(110000) });
  if (!r.ok) throw new Error("Cloudflare: "+(await r.text()).slice(0,300));
  const d=await r.json();
  const b=d?.result?.image;
  if(!b) throw new Error("Cloudflare returned no image");
  return {image:{base64:b,mimeType:"image/png"},provider:"Cloudflare Workers AI · FLUX Schnell"};
}
async function callOVH(prompt) {
  const r=await fetch("https://stable-diffusion-xl.endpoints.kepler.ai.cloud.ovh.net/api/text2image",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/octet-stream"},body:JSON.stringify({prompt,negative_prompt:"blurry, low quality, distorted"}),signal:AbortSignal.timeout(110000)});
  if(!r.ok) throw new Error("OVHcloud: "+(await r.text()).slice(0,250));
  const b=Buffer.from(await r.arrayBuffer());
  if(!b.length) throw new Error("OVHcloud returned an empty image");
  return {image:{base64:b.toString("base64"),mimeType:r.headers.get("content-type")?.includes("png")?"image/png":"image/jpeg"},provider:"OVHcloud AI Endpoints · SDXL"};
}
async function callXAI(prompt,size,image) {
  const model=process.env.XAI_IMAGE_MODEL||"grok-imagine-image-2.0";
  const endpoint="https://api.x.ai/v1/images/"+(image?"edits":"generations");
  const payload={model,prompt};
  if(image) payload.image={url:image,type:"image_url"}; else {payload.n=1;payload.aspect_ratio=size==="1024x1536"?"2:3":size==="1536x1024"?"3:2":"1:1";}
  const r=await fetch(endpoint,{method:"POST",headers:{Authorization:"Bearer "+process.env.XAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(110000)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error("xAI: "+(d?.error?.message||d?.message||r.status));
  const first=d?.data?.[0];if(!first?.url&&!first?.b64_json)throw new Error("xAI returned no image");
  return {image:first.url?{url:first.url}:{base64:first.b64_json,mimeType:"image/png"},provider:"xAI · Grok Imagine"};
}
async function callCustom(prompt,size) {
  const base=process.env.IMAGE_API_BASE_URL.replace(/\/+$/,"");
  const r=await fetch(base+"/images/generations",{method:"POST",headers:{Authorization:"Bearer "+process.env.IMAGE_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.IMAGE_MODEL,prompt,size,n:1}),signal:AbortSignal.timeout(110000)});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error("Custom provider: "+(d?.error?.message||d?.message||r.status));
  const f=d?.data?.[0];if(!f?.url&&!f?.b64_json)throw new Error("Custom provider returned no image");
  return {image:f.url?{url:f.url}:{base64:f.b64_json,mimeType:"image/png"},provider:process.env.IMAGE_PROVIDER_NAME||"Custom provider"};
}
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
  const {prompt,provider="auto",size="1024x1024",image}=req.body||{};
  if(typeof prompt!=="string"||!prompt.trim()||prompt.length>4000)return json(res,400,{error:"Enter a prompt of up to 4,000 characters."});
  if(!["1024x1024","1024x1536","1536x1024"].includes(size))return json(res,400,{error:"Unsupported image size."});
  if(image&&!isImage(image))return json(res,400,{error:"Use a PNG, JPEG or WEBP image smaller than 7 MB."});
  if(image&&provider!=="xai"&&provider!=="auto")return json(res,400,{error:"Image editing currently requires the xAI provider."});
  const configured={
    cloudflare:!!(process.env.CF_ACCOUNT_ID&&process.env.CF_API_TOKEN),
    "ovh-anon":true,
    xai:!!process.env.XAI_API_KEY,
    custom:!!(process.env.IMAGE_API_BASE_URL&&process.env.IMAGE_API_KEY&&process.env.IMAGE_MODEL)
  };
  const order=provider==="auto"?(image?["xai"]:["cloudflare","ovh-anon","xai","custom"]):[provider];
  const errors=[];
  for(const id of order){
    if(!configured[id])continue;
    try{
      const result=id==="cloudflare"?await callCloudflare(prompt,size):id==="ovh-anon"?(image?null:await callOVH(prompt)):id==="xai"?await callXAI(prompt,size,image):id==="custom"?(image?null:await callCustom(prompt,size)):null;
      if(result)return json(res,200,result);
    }catch(e){errors.push(e.message||String(e));}
  }
  return json(res,503,{error:errors.length?errors.join(" | "):"No compatible provider available. Configure Cloudflare credentials for the daily free quota, or select a supported provider."});
}
