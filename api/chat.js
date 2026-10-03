const UPSTREAM = 'https://davbot-api-xw6y.vercel.app/api/ask-apk';
const LIMIT = 30, WINDOW = 60000;
const buckets = new Map();

function clientIp(req){return (req.headers['x-forwarded-for']||'').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';}
function allowed(ip){
  const now=Date.now(), b=buckets.get(ip)||{t:now,n:0};
  if(now-b.t>WINDOW){b.t=now;b.n=0}
  b.n++; buckets.set(ip,b); return b.n<=LIMIT;
}
function originAllowed(req){
  const allowedOrigin=process.env.APP_ORIGIN;
  if(!allowedOrigin) return true;
  const origin=req.headers.origin;
  return !origin || origin===allowedOrigin;
}
function cleanHistory(h){
  if(!Array.isArray(h)) return [];
  return h.slice(-24).map(x=>({
    role:String(x?.role||'user').slice(0,20),
    content:String(x?.content||'').slice(0,8000)
  }));
}
module.exports=async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Access-Control-Allow-Origin',process.env.APP_ORIGIN||'');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({error:'Méthode non autorisée'});
  if(!originAllowed(req)) return res.status(403).json({error:'Origine refusée'});
  if(!allowed(clientIp(req))) return res.status(429).json({error:'Trop de requêtes. Réessaie dans une minute.'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const message=String(body.message||'').trim();
    if(!message) return res.status(400).json({error:'Message vide.'});
    if(message.length>16000) return res.status(413).json({error:'Message trop long.'});
    const image = typeof body.image === 'string' && body.image.startsWith('data:image/')
      ? body.image.slice(0, 900000)
      : '';
    const payload={message,history:cleanHistory(body.history)};
    if(image) payload.image=image;
    const headers={'Content-Type':'application/json','Accept':'application/json'};
    // Si ton backend amont demande une clé, elle reste dans Vercel.
    if(process.env.DAVBOT_UPSTREAM_KEY) headers['Authorization']='Bearer '+process.env.DAVBOT_UPSTREAM_KEY;
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),55000);
    const upstream=await fetch(UPSTREAM,{method:'POST',headers,body:JSON.stringify(payload),signal:controller.signal});
    clearTimeout(timer);
    const text=await upstream.text();
    res.status(upstream.status).setHeader('Content-Type',upstream.headers.get('content-type')||'application/json; charset=utf-8');
    return res.send(text);
  }catch(e){
    return res.status(e.name==='AbortError'?504:500).json({error:e.name==='AbortError'?'Le serveur IA a mis trop de temps à répondre.':'Erreur du serveur DAVBOT.'});
  }
};