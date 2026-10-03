const config = require("./config.js");

const LIMIT = 12, WINDOW = 60000;
const buckets = new Map();

function clientIp(req){
  return (req.headers['x-forwarded-for']||'').split(',')[0].trim() ||
    req.socket?.remoteAddress || 'unknown';
}
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
  if(!allowed(clientIp(req))) return res.status(429).json({error:'Limite de génération atteinte. Réessaie dans une minute.'});

  try{
    const raw=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const prompt=String(raw.prompt||raw.description||'').trim();
    if(!prompt) return res.status(400).json({error:'Prompt image vide.'});
    if(prompt.length>5000) return res.status(413).json({error:'Prompt trop long.'});

    if(!config.POLLINATIONS_API_KEY || config.POLLINATIONS_API_KEY.startsWith("REMPLACE_")){
      return res.status(500).json({error:"La clé POLLINATIONS_API_KEY n'est pas configurée dans api/config.js."});
    }

    // API OpenAI-compatible officielle de Pollinations.
    const upstream=await fetch(config.POLLINATIONS_API_URL,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Accept":"application/json",
        "Authorization":"Bearer "+config.POLLINATIONS_API_KEY
      },
      body:JSON.stringify({
        model:config.POLLINATIONS_MODEL,
        prompt,
        n:1,
        response_format:"b64_json"
      })
    });

    const type=upstream.headers.get('content-type')||'';
    const rawText=await upstream.text();
    let data; try{data=JSON.parse(rawText)}catch{data=null};

    if(!upstream.ok){
      return res.status(upstream.status).json({
        error:data?.error?.message || data?.error || "Le service de génération d'image a refusé la demande."
      });
    }

    const item=data?.data?.[0];
    const b64=item?.b64_json;
    const url=item?.url;

    if(b64){
      return res.status(200).json({url:`data:image/png;base64,${b64}`, model:config.POLLINATIONS_MODEL});
    }
    if(url){
      return res.status(200).json({url, model:config.POLLINATIONS_MODEL});
    }

    // Compatibilité avec d'éventuelles réponses directes.
    if(type.startsWith("image/")){
      const buf=Buffer.from(rawText,'binary');
      return res.status(200).json({url:`data:${type};base64,${buf.toString('base64')}`});
    }
    return res.status(502).json({error:"Réponse image reçue dans un format inattendu."});
  }catch(e){
    return res.status(500).json({error:e.message||"Erreur du serveur image DAVBOT."});
  }
};
