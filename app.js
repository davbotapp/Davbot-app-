const state={conversations:[],currentId:null,recognition:null,speaking:false};
const $=id=>document.getElementById(id);

async function load(){
  try{
    const r=await fetch("/api/conversations");
    const d=await r.json();
    state.conversations=d.conversations||[];
  }catch{state.conversations=[]}
  if(!state.conversations.length) createLocalConversation();
  else openConversation(state.conversations[0].id);
  renderHistory();
}
function createLocalConversation(){
  const c={id:crypto.randomUUID(),title:"Nouvelle discussion",messages:[],updatedAt:new Date().toISOString()};
  state.conversations.unshift(c); state.currentId=c.id; save(); renderHistory(); renderMessages();
}
async function save(){
  try{await fetch("/api/conversations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({conversations:state.conversations})})}catch{}
}
function current(){return state.conversations.find(x=>x.id===state.currentId)}
function renderHistory(){
  $("historyList").innerHTML=state.conversations.map(c=>`<div class="history-item ${c.id===state.currentId?"active":""}" data-id="${c.id}"><span>${escapeHtml(c.title)}</span><button data-delete="${c.id}" title="Supprimer">×</button></div>`).join("");
  document.querySelectorAll(".history-item").forEach(el=>el.onclick=e=>{if(e.target.dataset.delete)return;openConversation(el.dataset.id)});
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=e=>{e.stopPropagation();deleteConversation(b.dataset.delete)});
}
function openConversation(id){state.currentId=id;const c=current();$("chatTitle").textContent=c?.title||"Discussion";renderHistory();renderMessages()}
function renderMessages(){
  const c=current(); if(!c)return;
  if(!c.messages.length){$("chat").innerHTML=document.querySelector("#welcome")?`<div class="welcome" id="welcome"><div class="hero-icon">✦</div><h1>Comment puis-je vous aider ?</h1><p>Discutez avec DAVBOT AI pour coder, créer, apprendre, analyser et développer vos projets.</p><div class="suggestions"><button data-msg="Explique-moi l'intelligence artificielle">🤖 Intelligence artificielle</button><button data-msg="Donne-moi une idée de projet">🚀 Idée de projet</button><button data-msg="Aide-moi à programmer">⌘ Programmation</button></div></div>`:""};bindSuggestions();return}
  $("chat").innerHTML=c.messages.map((m,i)=>messageHtml(m,i)).join(""); $("chat").scrollTop=$("chat").scrollHeight;bindTools();
}
function messageHtml(m,i){
 const user=m.role==="user";
 return `<div class="message ${user?"user":""}"><div class="msg-avatar">${user?"U":"✦"}</div><div class="bubble-wrap"><div class="bubble">${escapeHtml(m.content)}</div><div class="message-tools">${!user?`<button data-speak="${i}">🔊</button><button data-copy="${i}">⧉</button><button data-regenerate="${i}">↻</button>`:`<button data-copy="${i}">⧉</button>`}</div></div></div>`;
}
function bindSuggestions(){document.querySelectorAll("[data-msg]").forEach(b=>b.onclick=()=>{ $("messageInput").value=b.dataset.msg;send()})}
function bindTools(){
 document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>navigator.clipboard?.writeText(current().messages[+b.dataset.copy].content));
 document.querySelectorAll("[data-speak]").forEach(b=>b.onclick=()=>speak(current().messages[+b.dataset.speak].content));
 document.querySelectorAll("[data-regenerate]").forEach(b=>b.onclick=()=>regenerate(+b.dataset.regenerate));
}
async function send(){
 const input=$("messageInput"), text=input.value.trim(); if(!text)return;
 const c=current(); c.messages.push({role:"user",content:text}); if(c.messages.length===1)c.title=text.slice(0,45); c.updatedAt=new Date().toISOString(); input.value="";resize();
 renderMessages(); addTyping();
 try{
   const r=await fetch("/api/ask",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text,history:c.messages.slice(-20,-1)})});
   const d=await r.json(); removeTyping();
   const answer=d.answer||d.message||d.response||d.error||"Aucune réponse.";
   c.messages.push({role:"assistant",content:answer});c.updatedAt=new Date().toISOString();await save();renderMessages();
   if($("autoSpeak").checked)speak(answer);
 }catch(e){removeTyping();c.messages.push({role:"assistant",content:"Une erreur est survenue. Vérifie la connexion à l'API DAVBOT."});await save();renderMessages()}
}
function addTyping(){const el=document.createElement("div");el.id="typing";el.className="message";el.innerHTML='<div class="msg-avatar">✦</div><div class="bubble-wrap"><div class="bubble"><div class="typing"><i></i><i></i><i></i></div></div></div>';$("chat").appendChild(el);$("chat").scrollTop=$("chat").scrollHeight}
function removeTyping(){$("typing")?.remove()}
async function regenerate(i){
 const c=current(), lastUser=c.messages.slice(0,i).reverse().find(m=>m.role==="user");if(!lastUser)return;c.messages=c.messages.slice(0,i);renderMessages();$("messageInput").value=lastUser.content;await send()
}
async function deleteConversation(id){state.conversations=state.conversations.filter(c=>c.id!==id);if(!state.conversations.length)createLocalConversation();else openConversation(state.conversations[0].id);await save();renderHistory()}
function speak(text){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="fr-FR";u.onstart=()=>state.speaking=true;u.onend=()=>state.speaking=false;speechSynthesis.speak(u)}
function resize(){const x=$("messageInput");x.style.height="auto";x.style.height=Math.min(x.scrollHeight,150)+"px"}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

$("sendButton").onclick=send;$("messageInput").addEventListener("input",resize);
$("messageInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});
$("newChat").onclick=createLocalConversation;
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("active");
$("settingsBtn").onclick=()=>$("settingsModal").classList.remove("hidden");
$("closeSettings").onclick=()=>$("settingsModal").classList.add("hidden");
$("themeSelect").onchange=e=>document.body.classList.toggle("light",e.target.value==="light");
$("clearAll").onclick=async()=>{state.conversations=[];createLocalConversation();await save();$("settingsModal").classList.add("hidden")};
$("searchBtn").onclick=()=>$("searchModal").classList.remove("hidden");
$("closeSearch").onclick=()=>$("searchModal").classList.add("hidden");
$("searchInput").oninput=e=>{$("searchResults").innerHTML=state.conversations.filter(c=>c.title.toLowerCase().includes(e.target.value.toLowerCase())).map(c=>`<div class="history-item" data-search="${c.id}">${escapeHtml(c.title)}</div>`).join("");document.querySelectorAll("[data-search]").forEach(x=>x.onclick=()=>{$("searchModal").classList.add("hidden");openConversation(x.dataset.search)})};
$("shareBtn").onclick=()=>{const c=current();navigator.clipboard?.writeText(c.messages.map(m=>`${m.role==="user"?"Vous":"DAVBOT AI"}: ${m.content}`).join("\n\n"));};
$("micBtn").onclick=()=>{
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){alert("La reconnaissance vocale n'est pas disponible sur ce navigateur.");return}
 if(state.recognition){state.recognition.stop();state.recognition=null;$("micBtn").classList.remove("recording");return}
 const r=new SR();r.lang="fr-FR";r.interimResults=true;r.continuous=false;
 r.onstart=()=>$("micBtn").classList.add("recording");r.onend=()=>{$("micBtn").classList.remove("recording");state.recognition=null};
 r.onresult=e=>{let t="";for(const x of e.results)t+=x[0].transcript;$("messageInput").value=t;resize()};state.recognition=r;r.start()
};
$("attachBtn").onclick=()=>alert("La gestion des pièces jointes peut être branchée au backend selon les fichiers que tu veux accepter.");
load();
