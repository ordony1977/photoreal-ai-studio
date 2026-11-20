import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const PORT=process.env.PORT||3000;
const root=path.resolve('public');
const respond=(res,status,data,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(type==='application/json'?JSON.stringify(data):data)};
const server=http.createServer(async(req,res)=>{
 if(req.method==='POST'&&req.url==='/api/image'){
  try{
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16_000_000)throw Error('Request too large')}
   const {key,prompt,model='grok-imagine-image',count=1,aspect_ratio='1:1',image}=JSON.parse(raw);
   if(!key||!prompt) return respond(res,400,{error:'API key and prompt required'});
   const edit=!!image;
   const payload={model,prompt,n:Math.max(1,Math.min(4,Number(count)||1)),response_format:'b64_json'};
   if(!edit) payload.aspect_ratio=aspect_ratio;
   else payload.image=image;
   const endpoint=edit?'https://api.x.ai/v1/images/edits':'https://api.x.ai/v1/images/generations';
   const upstream=await fetch(endpoint,{method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const body=await upstream.text();let data;try{data=JSON.parse(body)}catch{data={error:body.slice(0,500)}};
   return respond(res,upstream.status,data);
  }catch(e){return respond(res,500,{error:e.message})}
 }
 if(req.method!=='GET')return respond(res,405,{error:'Method not allowed'});
 const pathname=req.url==='/'?'/index.html':decodeURIComponent(req.url.split('?')[0]);
 const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))return respond(res,403,{error:'Forbidden'});
 try{const body=await fs.readFile(file);const ext=path.extname(file);return respond(res,200,body,ext==='.html'?'text/html; charset=utf-8':ext==='.js'?'text/javascript':ext==='.css'?'text/css':'application/octet-stream')}catch{return respond(res,404,{error:'Not found'})}
});server.listen(PORT,'127.0.0.1',()=>console.log(`Open http://localhost:${PORT}`));
