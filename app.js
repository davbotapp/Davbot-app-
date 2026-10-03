(() => {
"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY="davbot_v4_chats";
let chats=load(), currentId=chats[0]?.id||null, attached=null, recognition=null, recording=false;

function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2)}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}}
function save(){localStorage.setItem(KEY,JSON.stringify(chats))}
function current(){return chats.find(c=>c.id===currentId)}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function icon(name){
 const icons={bot:'<svg viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="12" rx="3"/><path d="M9 7V5a3 3 0 0 1 6 0v2M8.5 12h.01M15.5 12h.01M9 16h6"/></svg>',
 user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
 copy:'<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/></svg>',
 trash:'<svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4.5h6V7m-8 0 .8 13h8.4L17 7"/></svg>',
 download:'<svg viewBox="0 0 24 24"><path d="M12 3v12M8 11l4 4 4-4M5 19.5h14"/></svg>'};
 return icons[name]||"";
}
function newChat(){
 const c={id:uid(),title:"Nouvelle discussion",messages:[],created:Date.now()};
 chats.unshift(c);currentId=c.id;save();render();setView("chat");focusInput()
}
function ensure(){if(!currentId||!current()){newChat();return}render()}
function renderHistory(){
 const h=$("#history");h.innerHTML="";
 chats.forEach(c=>{const row=document.createElement("div");row.className="history-item"+(c.id===currentId?" active":"");
 row.innerHTML=`<span class="history-name">${escapeHtml(c.title||"Nouvelle discussion")}</span><button class="history-del" title="Supprimer">${icon("trash")}</button>`;
 row.onclick=e=>{if(e.target.closest("button"))return;currentId=c.id;render();setView("chat")};
 row.querySelector("button").onclick=e=>{e.stopPropagation();chats=chats.filter(x=>x.id!==c.id);if(c.id===currentId)currentId=chats[0]?.id||null;if(!currentId)newChat();else{save();render()}};
 h.appendChild(row)})
}
function render(){
 renderHistory();const m=$("#messages"),c=current();m.innerHTML="";
 if(!c){newChat();return}
 if(!c.messages.length){m.innerHTML=`<div class="welcome"><div class="welcome-logo">${icon("bot")}</div><h1>Bonjour 👋</h1><p>Je suis <b>DAVBOT AI</b>. Pose-moi une question, demande du code, un texte ou une analyse.</p><div class="suggestions">
 <button class="suggestion">Crée-moi une application web moderne</button><button class="suggestion">Explique-moi JavaScript simplement</button><button class="suggestion">Écris une description professionnelle</button><button class="suggestion">Génère une idée de logo</button></div></div>`;
 $$(".suggestion").forEach(b=>b.onclick=()=>{setView("chat");$("#input").value=b.textContent;send()});return}
 c.messages.forEach((msg,i)=>addMessageDOM(msg,i));
 m.scrollTop=m.scrollHeight
}
function addMessageDOM(msg,i){
 const m=$("#messages"),row=document.createElement("div");
 row.className="msg "+(msg.role==="user"?"user":"assistant");

 const imageHtml = msg.image
   ? `<div class="message-image"><img src="${escapeHtml(msg.image)}" alt="Image envoyée" loading="lazy"></div>`
   : "";
 const generatedHtml = msg.generatedImage
   ? `<div class="message-image generated-image"><img src="${escapeHtml(msg.generatedImage)}" alt="Image générée" loading="lazy">
      <a class="download-btn" href="${escapeHtml(msg.generatedImage)}" download="davbot-image.png">${icon("download")} Télécharger</a></div>`
   : "";

 row.innerHTML=`<div class="avatar">${icon(msg.role==="user"?"user":"bot")}</div>
 <div><div class="bubble">${escapeHtml(msg.content||"")}${imageHtml}${generatedHtml}</div>
 <div class="msg-actions"><button data-copy>${icon("copy")} Copier</button>
 <button data-del>${icon("trash")} Supprimer</button>
 ${msg.role==="assistant"?'<button data-speak>🔊 Lire</button>':""}</div></div>`;

 row.querySelector("[data-copy]").onclick=()=>navigator.clipboard?.writeText(msg.content||"");
 row.querySelector("[data-del]").onclick=()=>{const c=current();c.messages.splice(i,1);save();render()};
 row.querySelector("[data-speak]")?.addEventListener("click",()=>speak(msg.content||""));
 m.appendChild(row)
}

function add(role,content,extra={}){
 const c=current();c.messages.push({role,content,...extra});
 if(role==="user"&&c.title==="Nouvelle discussion")c.title=content.slice(0,42);
 save();render()
}
function speak(t){if("speechSynthesis"in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang="fr-FR";speechSynthesis.speak(u)}}
async function postChat(message, imageData=null){
 const c=current();
 const history=c.messages.slice(-24).map(x=>({
   role:x.role,
   content:String(x.content||"").slice(0,8000)
 }));

 const payload={message,history};
 if(imageData) payload.image=imageData;

 const r=await fetch("/api/chat",{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify(payload)
 });

 const raw=await r.text();
 let data;
 try{data=JSON.parse(raw)}catch{data={text:raw}};
 if(!r.ok)throw new Error(data.error||"Erreur serveur");
 return data.answer||data.message||data.response||data.text||data.result||"Réponse vide."
}

async function fileToDataURL(file){
 return new Promise((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(String(reader.result||""));
   reader.onerror=reject;
   reader.readAsDataURL(file);
 });
}

async function send(){
 const input=$("#input");
 const text=input.value.trim();
 if((!text && !attached) || $("#typing").classList.contains("busy"))return;

 const file=attached;
 attached=null;
 input.value="";
 resizeInput();
 $("#attachPreview").classList.add("hidden");

 let imageData=null;
 if(file && file.type.startsWith("image/")){
   imageData=await fileToDataURL(file);
 }

 // Image generation is handled by DAVBOT's deployed /api/image.
 // It is NOT sent to the text model as a normal chat request.
 const imageRequest=/\b(génère|genere|générer|generez|crée|cree|créer|creer|dessine|dessiner|produis|produire|fabrique|faire)\b[\s\S]{0,80}\b(image|photo|illustration|logo|affiche|poster|dessin|visuel)\b/i.test(text)
   || /\b(image|photo|illustration|logo|affiche|poster|dessin|visuel)\b[\s\S]{0,80}\b(génère|genere|crée|cree|dessine|produis|fabrique)\b/i.test(text);

 if(imageRequest && !imageData){
   add("user",text);
   await generateImage(text.replace(/^(génère|genere|générer|generez|crée|cree|créer|creer|dessine|dessiner|produis|produire|fabrique)\s*/i,"").trim() || text);
   return;
 }

 add("user",text || "Analyse cette image.",{image:imageData||undefined,fileName:file?.name||undefined});

 $("#typing").classList.remove("hidden");
 $("#typing").classList.add("busy");

 try{
   const answer=await postChat(text || "Analyse cette image et explique ce que tu vois.",imageData);
   add("assistant",answer);
 }catch(e){
   add("assistant","Erreur : "+e.message);
 }finally{
   $("#typing").classList.add("hidden");
   $("#typing").classList.remove("busy");
 }
}

async function generateImage(prompt){
 const clean=String(prompt||"").trim();
 if(!clean)return;

 $("#typing").classList.remove("hidden");
 $("#typing").classList.add("busy");

 try{
   const r=await fetch("/api/image",{
     method:"POST",
     headers:{"Content-Type":"application/json","Accept":"application/json"},
     body:JSON.stringify({prompt:clean,model:"flux"})
   });

   const raw=await r.text();
   let data=null;
   try{data=JSON.parse(raw)}catch{}

   if(!r.ok){
     throw new Error(data?.error||raw||"Erreur de génération");
   }

   let url="";
   if(data){
     url=data.image||data.url||data.imageUrl||data.image_url||data.output||data.result||"";
   }else if(r.headers.get("content-type")?.startsWith("image/")){
     const blob=await r.blob();
     url=URL.createObjectURL(blob);
   }

   if(typeof url!=="string" || !url){
     throw new Error("L'API DAVBOT n'a retourné aucune image.");
   }

   if(/^[A-Za-z0-9+/=]{100,}$/.test(url)){
     url="data:image/png;base64,"+url;
   }

   // Persist the generated image in the same conversation.
   add("assistant","Voici l'image générée.",{generatedImage:url});
 }catch(e){
   add("assistant","Impossible de générer l'image : "+e.message);
 }finally{
   $("#typing").classList.add("hidden");
   $("#typing").classList.remove("busy");
 }
}

async function generateProject(){
 const p=$("#projectPrompt").value.trim(),out=$("#projectResult");if(!p)return;
 out.classList.remove("hidden");out.textContent="Génération en cours…";
 try{out.textContent=await postChat("Crée un plan de projet web complet et concret pour : "+p)}catch(e){out.textContent="Erreur : "+e.message}
}
function setView(v){
 $$(".view").forEach(x=>x.classList.add("hidden"));$("#"+(v==="chat"?"chatView":v==="project"?"projectView":"imageView")).classList.remove("hidden");
 $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===v));$("#sidebar").classList.remove("open");if(v==="chat")render()
}
function resizeInput(){const x=$("#input");x.style.height="auto";x.style.height=Math.min(x.scrollHeight,180)+"px"}
async function startDictation(){
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){alert("La dictée vocale n'est pas disponible sur ce navigateur.");return}
 if(recognition){recognition.stop();return}
 recognition=new SR();recognition.lang="fr-FR";recognition.continuous=false;recognition.interimResults=true;
 recognition.onresult=e=>{$("#input").value=[...e.results].map(r=>r[0].transcript).join("");resizeInput()};
 recognition.onend=()=>{recognition=null;$("#micBtn").classList.remove("recording")};recognition.onerror=()=>{recognition=null;$("#micBtn").classList.remove("recording")};
 $("#micBtn").classList.add("recording");recognition.start()
}
function exportChat(){
 const c=current();if(!c)return;const text=c.messages.map(m=>`${m.role==="user"?"Vous":"DAVBOT AI"}:\n${m.content}`).join("\n\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));a.download="davbot-discussion.txt";a.click()
}
$("#newChat").onclick=newChat;$("#sendBtn").onclick=send;$("#micBtn").onclick=startDictation;$("#exportBtn").onclick=exportChat;
$("#themeBtn").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem("davbot_theme",document.body.classList.contains("light")?"light":"dark")};
$("#clearBtn").onclick=()=>{if(confirm("Supprimer toutes les discussions ?")){chats=[];newChat()}};
$("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
$("#attachBtn").onclick=()=>$("#fileInput").click();
$("#fileInput").onchange=e=>{
 attached=e.target.files[0]||null;
 if(attached){
   $("#attachPreview").textContent="Fichier : "+attached.name;
   $("#attachPreview").classList.remove("hidden");
 }
 e.target.value="";
};
$("#input").addEventListener("input",resizeInput);$("#input").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});
$$(".nav-item").forEach(b=>b.onclick=()=>setView(b.dataset.view));
$("#imageBtn").onclick=()=>generateImage($("#imagePrompt").value);$("#projectBtn").onclick=generateProject;
if(localStorage.getItem("davbot_theme")==="light")document.body.classList.add("light");
ensure();
})();