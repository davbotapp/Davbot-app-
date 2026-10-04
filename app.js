(() => {
"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const IMAGE_API="https://davbot-api-xw6y.vercel.app/api/image";
const KEY="davbot_v5_chats";
let chats=load(), currentId=chats[0]?.id||null, attached=null, attachedData=null, recognition=null;

function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2)}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}}
function save(){try{chats=Array.isArray(chats)?chats.slice(0,20):[];localStorage.setItem(KEY,JSON.stringify(chats))}catch(e){console.warn("DAVBOT: stockage local plein",e)}}
function current(){return chats.find(c=>c.id===currentId)}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function icon(name){const icons={bot:'<svg viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="12" rx="3"/><path d="M9 7V5a3 3 0 0 1 6 0v2M8.5 12h.01M15.5 12h.01M9 16h6"/></svg>',user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',copy:'<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 3 2"/></svg>',trash:'<svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4.5h6V7m-8 0 .8 13h8.4L17 7"/></svg>',download:'<svg viewBox="0 0 24 24"><path d="M12 3v12M8 11l4 4 4-4M5 19.5h14"/></svg>'};return icons[name]||""}
function newChat(){const c={id:uid(),title:"Nouvelle discussion",messages:[],created:Date.now()};chats.unshift(c);chats=chats.slice(0,20);currentId=c.id;save();render();focusInput()}
function ensure(){chats=Array.isArray(chats)?chats.slice(0,20):[];if(!currentId||!current()){newChat();return}save();render()}
function focusInput(){setTimeout(()=>$("#input")?.focus(),50)}
function renderHistory(){const h=$("#history");if(!h)return;h.innerHTML="";chats.forEach(c=>{const row=document.createElement("div");row.className="history-item"+(c.id===currentId?" active":"");row.innerHTML=`<span class="history-name">${escapeHtml(c.title||"Nouvelle discussion")}</span><button class="history-del" title="Supprimer">${icon("trash")}</button>`;row.onclick=e=>{if(e.target.closest("button"))return;currentId=c.id;$("#sidebar")?.classList.remove("open");render();focusInput()};row.querySelector("button").onclick=e=>{e.stopPropagation();chats=chats.filter(x=>x.id!==c.id);if(c.id===currentId)currentId=chats[0]?.id||null;if(!currentId)newChat();else{save();render()}};h.appendChild(row)})}
function render(){renderHistory();const m=$("#messages"),c=current();if(!m)return;m.innerHTML="";if(!c){newChat();return}if(!c.messages.length){m.innerHTML=`<div class="welcome"><div class="welcome-logo">${icon("bot")}</div><h1>Bonjour 👋</h1><p>Je suis <b>DAVBOT AI</b>. Pose-moi une question, envoie une image à analyser, demande une modification d'image ou demande une création personnalisée.</p><div class="suggestions"><button class="suggestion">Analyse cette image</button><button class="suggestion">Crée une image futuriste de Kinshasa</button><button class="suggestion">Modifie cette photo avec un arrière-plan premium</button><button class="suggestion">Explique-moi JavaScript simplement</button></div></div>`;$$('.suggestion').forEach(b=>b.onclick=()=>{$("#input").value=b.textContent;focusInput()});return}c.messages.forEach((msg,i)=>addMessageDOM(msg,i));m.scrollTop=m.scrollHeight}
function addMessageDOM(msg,i){const m=$("#messages"),row=document.createElement("div");row.className="msg "+(msg.role==="user"?"user":"assistant");const image=msg.image||msg.generatedImage||"";const imageHtml=image?`<div class="message-image"><img src="${escapeHtml(image)}" alt="Image DAVBOT" loading="lazy"><div class="image-actions"><a class="download-btn" href="${escapeHtml(image)}" download="davbot-image.png">${icon("download")} Télécharger</a><button type="button" data-edit-image>✏️ Modifier cette image</button></div></div>`:"";row.innerHTML=`<div class="avatar">${icon(msg.role==="user"?"user":"bot")}</div><div><div class="bubble">${escapeHtml(msg.content)}</div>${imageHtml}<div class="msg-actions"><button data-copy>${icon("copy")} Copier</button><button data-del>${icon("trash")} Supprimer</button>${msg.role==="assistant"?'<button data-speak>🔊 Lire</button>':""}</div></div>`;row.querySelector("[data-copy]")?.addEventListener("click",()=>navigator.clipboard?.writeText(msg.content));row.querySelector("[data-del]")?.addEventListener("click",()=>{const c=current();c.messages.splice(i,1);save();render()});row.querySelector("[data-speak]")?.addEventListener("click",()=>speak(msg.content));row.querySelector("[data-edit-image]")?.addEventListener("click",()=>{const input=$("#input");input.value="Modifie cette image : ";focusInput()});m.appendChild(row)}
function add(role,content,extra={}){const c=current();c.messages.push({role,content,...extra});if(role==="user"&&c.title==="Nouvelle discussion")c.title=content.slice(0,42);save();render()}
async function addAssistantAnimated(content,extra={}){
  const c=current();
  const msg={role:"assistant",content:"",...extra};
  c.messages.push(msg);
  save();
  render();
  const bubbles=$$("#messages .msg.assistant .bubble");
  const bubble=bubbles[bubbles.length-1];
  if(!bubble){msg.content=content;save();render();return}
  bubble.textContent="";
  const speed=content.length>900?7:content.length>450?10:14;
  for(let i=0;i<content.length;i++){
    msg.content=content.slice(0,i+1);
    bubble.textContent=msg.content;
    if(i%12===0) save();
    const m=$("#messages"); if(m)m.scrollTop=m.scrollHeight;
    await new Promise(r=>setTimeout(r,speed));
  }
  msg.content=content;
  save();
}
function speak(t){if("speechSynthesis"in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang="fr-FR";speechSynthesis.speak(u)}}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=()=>reject(new Error("Impossible de lire l'image."));r.readAsDataURL(file)})}
function getLastImage(){const c=current();if(!c)return null;for(let i=c.messages.length-1;i>=0;i--){const x=c.messages[i];if(x.generatedImage)return x.generatedImage;if(x.image)return x.image}return null}
function normalizeIntentText(text){return String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’']/g,"'")}
function isImageIntent(text){
  const t=normalizeIntentText(text);
  const creation=/(^|\\s)(cree|creer|cree-moi|creez|creez-moi|creation|genere|generer|genere-moi|generez|dessine|dessiner|dessine-moi|produis|produire|produisez|fabrique|fabriquer|fabrique-moi|fais|fais-moi|faire|concois|concevoir|construis|construire|imagine|imaginer|realise|realiser|compose|composer|cree une|genere une|fais une)(?=\\s|[-,!.?]|$)/i.test(t);
  const visual=/(image|photo|photographie|illustration|logo|affiche|poster|dessin|visuel|portrait|avatar|banniere|fond d'ecran|wallpaper|icone|couverture|image personnalisee|photo personnalisee)/i.test(t);
  const direct=/^(image|photo|logo|illustration|affiche|poster|portrait|dessin)\\s*[:,-]/i.test(t);
  return (creation&&visual)||direct;
}
function isEditIntent(text){
  const t=normalizeIntentText(text);
  const edit=/(modifie|modifier|modification|change|changer|changement|transforme|transformer|retouche|retoucher|ameliore|ameliorer|supprime|supprimer|remplace|remplacer|ajoute|ajouter|enleve|enlever|mets|mettre|habille|habiller|recadre|recadrer|restaure|restaurer|nettoie|nettoyer|colorise|coloriser|agrandis|agrandir|floute|flouter|rends|rendre|change-moi|modifie-moi)/i.test(t);
  const visual=/(image|photo|illustration|logo|affiche|poster|dessin|visuel|portrait|arriere-plan|arriere plan|fond|background|visage|vetement|costume|tenue|cheveux|couleur|objet|decor|ciel|luminosite)/i.test(t);
  return edit&&(visual||/(arriere-plan|arriere plan|background|fond)/i.test(t));
}
async function postChat(message,image){
  const c=current();
  const history=c.messages.slice(-20).map(x=>({role:x.role,content:String(x.content||"").slice(0,8000)}));
  const memory=chats.slice(0,20).filter(x=>x.id!==c.id).map(x=>{
    const recent=(x.messages||[]).slice(-2).map(m=>({role:m.role,content:String(m.content||"").slice(0,700)}));
    return {title:String(x.title||"Discussion").slice(0,100),messages:recent};
  }).filter(x=>x.messages.length);
  const body={message,history,memory};
  if(image)body.image=image;
  const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data={text:raw}}
  if(!r.ok)throw new Error(data.error||"Erreur serveur");
  return data.answer||data.message||data.response||data.text||data.result||"Réponse vide.";
}
async function generateImage(prompt,images=[],type="normal"){const c=current();add("assistant","🎨 Je prépare ton image…");$("#typing").classList.remove("hidden");$("#typing").classList.add("busy");try{const operation=images.length?"edit":"generate";const body={prompt:prompt.trim(),operation,type,size:"1024x1024"};if(images.length)body.images=images.slice(0,5);const r=await fetch(IMAGE_API,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(body)});const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data={}}if(!r.ok)throw new Error(data.error||raw||"Erreur de génération d'image");const url=data.image||data.url||data.imageUrl||data.image_url||data.output||data.result;if(!url||typeof url!=="string")throw new Error("Aucune image reçue de l'API DAVBOT");const last=current().messages[current().messages.length-1];if(last?.role==="assistant"&&last.content==="🎨 Je prépare ton image…"){last.content=images.length?"Voici la version modifiée :":"Voici ton image :";last.generatedImage=url;last.imageOperation=operation;last.imageModel=data.model||null;save();render()}else add("assistant",images.length?"Voici la version modifiée :":"Voici ton image :",{generatedImage:url,imageOperation:operation,imageModel:data.model||null});return url}catch(e){const last=current().messages[current().messages.length-1];if(last?.role==="assistant"&&last.content==="🎨 Je prépare ton image…"){last.content="❌ Erreur image : "+e.message;save();render()}else add("assistant","❌ Erreur image : "+e.message)}finally{$("#typing").classList.add("hidden");$("#typing").classList.remove("busy")}}
async function send(){const input=$("#input"),text=input.value.trim();if(!text||$("#typing").classList.contains("busy"))return;input.value="";resizeInput();let image=attachedData;const filename=attached?.name||"";attached=null;attachedData=null;$("#attachPreview").classList.add("hidden");const previousImage=getLastImage();const editSource=image||((isEditIntent(text)&&previousImage)?previousImage:null);const imageTask=isImageIntent(text)||(isEditIntent(text)&&!!editSource);if(imageTask){add("user",filename?text+`\n[Fichier image joint: ${filename}]`:text,image?{image}:{});await generateImage(text,editSource?[editSource]:[],"normal");return}add("user",filename?text+`\n[Fichier joint: ${filename}]`:text,image?{image}:{});$("#typing").classList.remove("hidden");$("#typing").classList.add("busy");try{const answer=await postChat(text,image);await addAssistantAnimated(answer)}catch(e){add("assistant","Erreur : "+e.message)}finally{$("#typing").classList.add("hidden");$("#typing").classList.remove("busy")}}
async function generateFromPanel(){const p=$("#imagePrompt")?.value.trim();if(!p)return;await generateImage(p,[],"normal")}
function setView(v){$$('.view').forEach(x=>x.classList.add('hidden'));const target=$("#"+(v==="chat"?"chatView":v==="project"?"projectView":"imageView"));if(target)target.classList.remove('hidden');$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===v));$("#sidebar")?.classList.remove('open');if(v==="chat")render()}
function resizeInput(){const x=$("#input");if(!x)return;x.style.height="auto";x.style.height=Math.min(x.scrollHeight,180)+"px"}
function startDictation(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert("La dictée vocale n'est pas disponible sur ce navigateur.");return}if(recognition){recognition.stop();return}recognition=new SR();recognition.lang="fr-FR";recognition.continuous=false;recognition.interimResults=true;recognition.onresult=e=>{$("#input").value=[...e.results].map(r=>r[0].transcript).join("");resizeInput()};recognition.onend=()=>{recognition=null;$("#micBtn")?.classList.remove("recording")};recognition.onerror=()=>{recognition=null;$("#micBtn")?.classList.remove("recording")};$("#micBtn")?.classList.add("recording");recognition.start()}
function exportChat(){const c=current();if(!c)return;const text=c.messages.map(m=>`${m.role==="user"?"Vous":"DAVBOT AI"}:\n${m.content}`).join("\n\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));a.download="davbot-discussion.txt";a.click();URL.revokeObjectURL(a.href)}
$("#newChat")?.addEventListener("click",newChat);$("#sendBtn")?.addEventListener("click",send);$("#micBtn")?.addEventListener("click",startDictation);$("#exportBtn")?.addEventListener("click",exportChat);$("#themeBtn")?.addEventListener("click",()=>{document.body.classList.toggle("light");localStorage.setItem("davbot_theme",document.body.classList.contains("light")?"light":"dark")});$("#clearBtn")?.addEventListener("click",()=>{if(confirm("Supprimer toutes les discussions ?")){chats=[];save();newChat()}});$("#menuBtn")?.addEventListener("click",()=>$("#sidebar")?.classList.toggle("open"));$("#attachBtn")?.addEventListener("click",()=>$("#fileInput")?.click());$("#fileInput")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(f){if(!f.type.startsWith("image/")){alert("Pour analyser ou modifier une image, sélectionne une image PNG, JPEG, WebP ou GIF.");e.target.value="";return}if(f.size>15*1024*1024){alert("Image trop volumineuse. Maximum 15 Mo.");e.target.value="";return}try{attached=f;attachedData=await fileToDataUrl(f);$("#attachPreview").textContent="Image : "+f.name;$("#attachPreview").classList.remove("hidden")}catch(err){alert(err.message)}}e.target.value=""});$("#input")?.addEventListener("input",resizeInput);$("#input")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});$$('.nav-item').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));$("#imageBtn")?.addEventListener("click",generateFromPanel);
if(localStorage.getItem("davbot_theme")==="light")document.body.classList.add("light");ensure();
})();
