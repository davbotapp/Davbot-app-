const UPSTREAM = 'https://davbot-api-xw6y.vercel.app/api/image';
const LIMIT = 12, WINDOW = 60000;
const buckets = new Map();

function clientIp(req){
  return (req.headers['x-forwarded-for']||'').split(',')[0].trim()
    || req.socket?.remoteAddress || 'unknown';
}
function allowed(ip){
  const now=Date.now(), b=buckets.get(ip)||{t:now,n:0};
  if(now-b.t>WINDOW){b.t=now;b.n=0}
  b.n++;
  buckets.set(ip,b);
  return b.n<=LIMIT;
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
  res.setHeader('Access-Control-Allow-Origin',process.env.APP_ORIGIN||'*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');

  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({error:'Méthode non autorisée'});
  if(!originAllowed(req)) return res.status(403).json({error:'Origine refusée'});
  if(!allowed(clientIp(req))) return res.status(429).json({
    error:'Limite de génération atteinte. Réessaie dans une minute.'
  });

  try{
    const raw=typeof req.body==='string'
      ? JSON.parse(req.body||'{}')
      : (req.body||{});

    const prompt=String(raw.prompt||raw.description||'').trim();
    if(!prompt) return res.status(400).json({error:'Prompt image vide.'});
    if(prompt.length>5000) return res.status(413).json({error:'Prompt trop long.'});

    // Only DAVBOT's deployed image API receives the generation request.
    const body={
      ...raw,
      prompt,
      model: raw.model || 'flux'
    };

    // Never forward client-supplied secrets.
    delete body.apiKey;
    delete body.api_key;
    delete body.key;
    delete body.authorization;
    delete body.GROQ_API_KEY;
    delete body.POLLINATIONS_API_KEY;

    const headers={
      'Content-Type':'application/json',
      'Accept':'application/json, image/*, */*'
    };

    // Optional authentication for the separately deployed DAVBOT API.
    if(process.env.DAVBOT_IMAGE_KEY){
      headers['Authorization']='Bearer '+process.env.DAVBOT_IMAGE_KEY;
    }

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),100000);

    const upstream=await fetch(UPSTREAM,{
      method:'POST',
      headers,
      body:JSON.stringify(body),
      signal:controller.signal
    });

    clearTimeout(timer);

    const type=upstream.headers.get('content-type')||'';

    if(type.startsWith('image/')){
      const buf=Buffer.from(await upstream.arrayBuffer());
      return res.status(upstream.status)
        .setHeader('Content-Type',type)
        .send(buf);
    }

    const text=await upstream.text();
    return res.status(upstream.status)
      .setHeader('Content-Type',type||'application/json; charset=utf-8')
      .send(text);

  }catch(e){
    return res.status(e.name==='AbortError'?504:500).json({
      error:e.name==='AbortError'
        ? 'La génération a dépassé le délai.'
        : 'Erreur de communication avec l’API image DAVBOT.'
    });
  }
};
