(() => {
  'use strict';

  const API = '/api/chat';
  const STORAGE = 'davbot_ai_chats_v1';
  const CURRENT = 'davbot_ai_current_v1';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const chat = $('#chat');
  const input = $('#messageInput');
  const send = $('#sendButton');
  const historyList = $('#historyList');
  const welcome = $('#welcome');
  const newChat = $('#newChat');

  let chats = loadChats();
  let currentId = localStorage.getItem(CURRENT) || null;
  let busy = false;

  function uid() { return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function loadChats() { try { return JSON.parse(localStorage.getItem(STORAGE) || '[]'); } catch { return []; } }
  function save() { localStorage.setItem(STORAGE, JSON.stringify(chats.slice(0, 30))); localStorage.setItem(CURRENT, currentId || ''); }
  function current() { return chats.find(c => c.id === currentId); }
  function ensureChat() {
    let c = current();
    if (!c) { c = { id: uid(), title: 'Nouvelle discussion', messages: [], createdAt: Date.now() }; chats.unshift(c); currentId = c.id; save(); }
    return c;
  }
  function escapeHtml(v) { return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = chats.length ? chats.map(c => `<div class="history-item ${c.id === currentId ? 'active' : ''}" data-id="${c.id}" title="${escapeHtml(c.title)}">${escapeHtml(c.title)}</div>`).join('') : '';
    $$('.history-item').forEach(el => el.onclick = () => { currentId = el.dataset.id; save(); render(); });
  }
  function render() {
    const c = ensureChat();
    renderHistory();
    if (!chat) return;
    chat.innerHTML = '';
    if (!c.messages.length) { chat.appendChild(welcome); welcome.style.display = 'flex'; return; }
    welcome.style.display = 'none';
    c.messages.forEach(m => addMessage(m.role, m.content, false));
    scrollBottom();
  }
  function scrollBottom() { requestAnimationFrame(() => { chat.scrollTop = chat.scrollHeight; }); }
  function addMessage(role, content, scroll = true) {
    const row = document.createElement('div'); row.className = 'message ' + role;
    const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = role === 'user' ? 'U' : 'D';
    const box = document.createElement('div'); box.className = 'bubble'; box.innerHTML = formatText(content);
    row.append(avatar, box); chat.appendChild(row);
    if (role === 'assistant') addActions(row, content);
    if (scroll) scrollBottom();
    return row;
  }
  function formatText(text) {
    const safe = escapeHtml(text);
    return safe.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>').replace(/\n/g, '<br>');
  }
  function addActions(row, content) {
    const actions = document.createElement('div'); actions.className = 'message-actions';
    const copy = document.createElement('button'); copy.type='button'; copy.title='Copier'; copy.textContent='Copier';
    const speak = document.createElement('button'); speak.type='button'; speak.title='Lire'; speak.textContent='Lire';
    copy.onclick = async () => { try { await navigator.clipboard.writeText(content); copy.textContent='Copié'; setTimeout(()=>copy.textContent='Copier',1200); } catch {} };
    speak.onclick = () => speakText(content);
    actions.append(copy, speak); row.appendChild(actions);
  }
  function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang='fr-FR'; speechSynthesis.speak(u);
  }
  function typing() {
    const row = document.createElement('div'); row.className='message assistant'; row.id='typing';
    const avatar=document.createElement('div'); avatar.className='avatar'; avatar.textContent='D';
    const box=document.createElement('div'); box.className='bubble'; box.innerHTML='<div class="typing"><span></span><span></span><span></span></div>';
    row.append(avatar,box); chat.appendChild(row); scrollBottom(); return row;
  }
  async function sendMessage(text) {
    text = String(text || '').trim(); if (!text || busy) return;
    const c = ensureChat(); busy=true; send.disabled=true;
    if (!c.messages.length) c.title = text.length > 38 ? text.slice(0,38) + '…' : text;
    c.messages.push({role:'user', content:text}); save(); render();
    typing();
    try {
      const history = c.messages.slice(-20).map(m => ({ role:m.role, content:m.content }));
      const r = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body:JSON.stringify({message:text, history}) });
      const data = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(data.error || 'Erreur API');
      const answer = data.answer ?? data.message ?? data.response ?? data.text ?? data.result;
      if (!answer) throw new Error('Réponse API vide');
      $('#typing')?.remove();
      c.messages.push({role:'assistant', content:String(answer)}); save(); addMessage('assistant', String(answer));
    } catch (e) {
      $('#typing')?.remove();
      addMessage('assistant', 'Désolé, la connexion à DAVBOT AI a échoué. Vérifie le déploiement du backend et réessaie.');
      console.error(e);
    } finally { busy=false; send.disabled=false; input.focus(); }
  }
  send?.addEventListener('click', () => sendMessage(input.value).then(()=>input.value=''));
  input?.addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); const v=input.value; input.value=''; sendMessage(v); } });
  newChat?.addEventListener('click', () => { const c={id:uid(),title:'Nouvelle discussion',messages:[],createdAt:Date.now()}; chats.unshift(c); currentId=c.id; save(); render(); input?.focus(); });
  $$('.suggestions button').forEach(b => b.addEventListener('click', () => sendMessage(b.dataset.msg || b.textContent)));

  // Dictée vocale : Web Speech API, aucune donnée audio envoyée au backend.
  const mic=document.createElement('button'); mic.type='button'; mic.className='voice-button'; mic.title='Message vocal'; mic.textContent='🎙';
  document.querySelector('.input-box')?.insertBefore(mic, send);
  const SR=window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    const rec=new SR(); rec.lang='fr-FR'; rec.interimResults=false; rec.continuous=false;
    rec.onstart=()=>mic.classList.add('recording'); rec.onend=()=>mic.classList.remove('recording');
    rec.onresult=e=>{ input.value=(input.value+' '+e.results[0][0].transcript).trim(); input.focus(); };
    mic.onclick=()=>{ try { rec.start(); } catch {} };
  } else mic.disabled=true;

  // Export simple d'une discussion courante.
  const exportBtn=document.createElement('button'); exportBtn.type='button'; exportBtn.className='utility-button'; exportBtn.textContent='Exporter'; exportBtn.title='Exporter la discussion';
  document.querySelector('.topbar')?.appendChild(exportBtn);
  exportBtn.onclick=()=>{ const c=current(); if(!c) return; const txt=c.messages.map(m=>(m.role==='user'?'Vous':'DAVBOT AI')+' :\n'+m.content).join('\n\n'); const blob=new Blob([txt],{type:'text/plain;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=(c.title||'davbot-discussion').replace(/[^\w\-]+/g,'_')+'.txt'; a.click(); URL.revokeObjectURL(a.href); };

  render();
})();
