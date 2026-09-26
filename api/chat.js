const UPSTREAM = 'https://davbot-api-xw6y.vercel.app/api/ask-apk';
const WINDOW_MS = 60_000;
const LIMIT = 30;
const buckets = new Map();

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function clientKey(req) {
  const f = req.headers['x-forwarded-for'];
  return String(f || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}
function limited(key) {
  const now=Date.now(); const old=buckets.get(key);
  if (!old || now-old.start >= WINDOW_MS) { buckets.set(key,{start:now,count:1}); return false; }
  old.count++; return old.count > LIMIT;
}
module.exports = async (req,res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Méthode non autorisée'});
  if (limited(clientKey(req))) return res.status(429).json({error:'Trop de requêtes. Réessaie dans une minute.'});
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return res.status(400).json({error:'Message requis'});
    if (message.length > 12000) return res.status(413).json({error:'Message trop long'});
    const history = Array.isArray(body.history) ? body.history.slice(-20).filter(x => x && ['user','assistant'].includes(x.role) && typeof x.content === 'string').map(x => ({role:x.role,content:x.content.slice(0,12000)})) : [];
    const controller = new AbortController(); const timer=setTimeout(()=>controller.abort(), 45_000);
    const upstream = await fetch(UPSTREAM,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({message,history}),signal:controller.signal});
    clearTimeout(timer);
    const text=await upstream.text();
    let data; try { data=JSON.parse(text); } catch { data={message:text}; }
    if (!upstream.ok) return res.status(upstream.status >= 500 ? 502 : upstream.status).json({error:data.error || data.message || 'API DAVBOT indisponible'});
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({error:e.name === 'AbortError' ? 'Délai API dépassé' : 'Impossible de joindre l’API DAVBOT'});
  }
};
