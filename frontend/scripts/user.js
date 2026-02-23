const DB={kSession:"RE_session",session(){try{return JSON.parse(localStorage.getItem(this.kSession));}catch{return null;}},setSession(v){localStorage.setItem(this.kSession,JSON.stringify(v));},guard(){const s=this.session();if(!s||s.role!=="user"){window.location.href="../index.html";}}};
DB.guard();

function money(v){const n=Number(v);return Number.isNaN(n)?v:"₱"+n.toLocaleString();}
function placeholderImg(t="No Photo"){return"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='#111827'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#6b7280' font-size='12'>${t}</text></svg>`);} 

async function loadListings(params={}){
  return window.API.listings.list({
    q: params.q,
    minPrice: params.mi,
    maxPrice: params.ma,
    beds: params.bed,
    baths: undefined,
    city: params.loc,
    status: params.st
  });
}

function render(list){
  const holder=document.querySelector("#list"),empty=document.querySelector("#empty");holder.innerHTML="";if(!list.length){empty.style.display="block";return;}empty.style.display="none";
  list.forEach(it=>{
    const card=document.createElement("div");card.className="card-item";
    const img=document.createElement("img");img.className="thumb";const photo=(Array.isArray(it.images)&&it.images[0])||"";img.src=photo||placeholderImg();img.onerror=()=>img.src=placeholderImg();img.onclick=()=>openView(it);card.appendChild(img);
    const body=document.createElement("div");
    const top=document.createElement("div");const title=document.createElement("div");title.className="title";title.textContent=it.title;top.appendChild(title);body.appendChild(top);
    const meta=document.createElement("div");meta.className="meta";const status=(it.status||'available');meta.textContent=`${money(it.price)} / mo • ${it.beds??0} BR • ${it.baths??0} BA • ${it.city||"Unknown"}`;body.appendChild(meta);
    const pill=document.createElement("span");pill.className=`badge pill ${status}`;pill.textContent=status==='rented'? 'Rented':'Available';card.appendChild(pill);
    if(it.description){const d=document.createElement("div");d.textContent=it.description;body.appendChild(d);} 
    const act=document.createElement("div");act.className="actions-inline";
    const msg=document.createElement("button");msg.className="btn btn-primary";msg.textContent="Message Owner";msg.onclick=()=>openPrivateChat(it.id, it.owner_id);act.appendChild(msg);
    body.appendChild(act);card.appendChild(body);holder.appendChild(card);
  });
}

async function applyFilters(){
  const params={loc:document.querySelector("#fLocation").value.trim().toLowerCase(),bed:document.querySelector("#fBedrooms").value,mi:document.querySelector("#fMinPrice").value,ma:document.querySelector("#fMaxPrice").value,st:document.querySelector("#fStatus").value,q:document.querySelector("#fQuery").value.trim().toLowerCase()};
  try{
    const all=await loadListings(params);
    render(all);
  }catch{ render([]); }
}

function extractApiError(err, fallback='Something went wrong'){
  const raw=String(err?.message||'').trim();
  if(!raw) return fallback;
  try{
    const parsed=JSON.parse(raw);
    if(parsed&&typeof parsed.error==='string'&&parsed.error.trim()) return parsed.error.trim();
  }catch{}
  return raw;
}

const profileModal=document.getElementById('profileModal');
const profileForm=document.getElementById('profileForm');
const profileName=document.getElementById('profileName');
const profileEmail=document.getElementById('profileEmail');
const profilePassword=document.getElementById('profilePassword');
const btnProfile=document.getElementById('btnProfile');
const btnProfileCancel=document.getElementById('btnProfileCancel');
const btnProfileSave=document.getElementById('btnProfileSave');

function hydrateProfileForm(user){
  if(!profileForm||!user) return;
  profileName.value=user.name||'';
  profileEmail.value=user.email||'';
  profilePassword.value='';
}

function syncSessionUser(user){
  const current=DB.session()||{};
  DB.setSession({...current,username:user?.name||current.username,user:{...current.user,...user}});
}

async function refreshSessionProfile(){
  if(!window.API?.auth?.me) return;
  try{
    const resp=await window.API.auth.me();
    if(resp?.user){
      syncSessionUser(resp.user);
      hydrateProfileForm(resp.user);
    }
  }catch{}
}

function openProfileModal(){
  hydrateProfileForm(DB.session()?.user||{});
  profileModal&&profileModal.classList.remove('hidden');
}

document.querySelector("#btnApply").addEventListener("click",applyFilters);
document.querySelector("#btnClear").addEventListener("click",()=>{["#fLocation","#fBedrooms","#fMinPrice","#fMaxPrice","#fStatus","#fQuery"].forEach(s=>document.querySelector(s).value="");applyFilters();});
document.querySelector("#btnLogout").addEventListener("click",()=>{localStorage.removeItem(DB.kSession);window.location.href="../index.html";});
btnProfile&&btnProfile.addEventListener('click',openProfileModal);
btnProfileCancel&&btnProfileCancel.addEventListener('click',()=>profileModal&&profileModal.classList.add('hidden'));
profileForm&&profileForm.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const name=String(profileName?.value||'').trim();
  const email=String(profileEmail?.value||'').trim();
  const password=String(profilePassword?.value||'').trim();
  if(!name||!email){ notify('Name and email are required'); return; }
  const payload={name,email};
  if(password) payload.password=password;
  try{
    if(btnProfileSave) btnProfileSave.disabled=true;
    const resp=await window.API.auth.updateProfile(payload);
    if(resp?.user){
      syncSessionUser(resp.user);
      hydrateProfileForm(resp.user);
    }
    profileModal&&profileModal.classList.add('hidden');
    notify('Profile updated successfully');
  }catch(err){
    notify(extractApiError(err,'Failed to update profile'));
  }finally{
    if(btnProfileSave) btnProfileSave.disabled=false;
  }
});
applyFilters();
refreshSessionProfile();

const pubList=document.getElementById('pubChatList');
const pubInput=document.getElementById('pubChatInput');
const pubSend=document.getElementById('pubChatSend');
let pubAfterId=0;let pubTimer=null;
const stickers=['👍','😊','❤️','😢','😮'];
// augment input row with buttons and sticker picker
const inputRow=pubSend?.parentElement; let fileBtn=null, fileInp=null, stkBtn=null, stkPicker=null; let stkOpen=false;
if(inputRow){
  fileBtn=document.createElement('button'); fileBtn.type='button'; fileBtn.className='btn-icon'; fileBtn.textContent='Image';
  fileInp=document.createElement('input'); fileInp.type='file'; fileInp.accept='image/*'; fileInp.style.display='none';
  stkBtn=document.createElement('button'); stkBtn.type='button'; stkBtn.className='btn-icon'; stkBtn.textContent='Stickers';
  stkPicker=document.createElement('div'); stkPicker.className='sticker-picker'; stkPicker.style.display='none';
  const grid=document.createElement('div'); grid.className='sticker-grid';
  stickers.forEach(em=>{ const btn=document.createElement('button'); btn.type='button'; btn.textContent=em; btn.onclick=async()=>{ try{ await window.API.chat.public.send(em,'sticker'); hideSticker(); }catch{ notify('Failed to send'); } }; grid.appendChild(btn); });
  stkPicker.appendChild(grid);
  inputRow.parentElement.appendChild(stkPicker);
  // Order: input | Send | Stickers | Image
  inputRow.appendChild(pubSend);
  inputRow.appendChild(stkBtn);
  inputRow.appendChild(fileBtn);
  inputRow.appendChild(fileInp);
  fileBtn.onclick=()=>fileInp.click();
  function hideSticker(){ stkOpen=false; stkPicker.style.display='none'; }
  stkBtn.onclick=()=>{ stkOpen=!stkOpen; stkPicker.style.display= stkOpen?'block':'none'; };
  fileInp.onchange=async(e)=>{
    const f=e.target.files && e.target.files[0]; if(!f) return; if(f.size>4.5*1024*1024){ notify('Image is too large. Max 4.5MB'); return; }
    try{
      const b64=await new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(f); });
      await window.API.chat.public.send(String(b64),'image'); fileInp.value='';
    }catch{ notify('Failed to send'); }
  };
}
function renderBubble(m){
  const meId=DB.session()?.user?.id; const isMe=m.sender_id===meId;
  const wrap=document.createElement('div'); wrap.className='chat-msg'+(isMe?' me':'');
  const bubble=document.createElement('div'); bubble.className='msg-bubble';
  if(m.deleted_at){ const t=document.createElement('div'); t.className='msg-text'; t.textContent='(message deleted)'; bubble.appendChild(t); }
  else if(m.kind==='image'||(/^data:image\//.test(m.content))){ const img=document.createElement('img'); img.className='msg-image'; img.src=m.content; bubble.appendChild(img); }
  else if(m.kind==='sticker'){
    if(/^https?:\/\//.test(m.content)||/^data:image\//.test(m.content)){
      const img=document.createElement('img'); img.className='msg-image'; img.src=m.content; bubble.appendChild(img);
    }else{ const t=document.createElement('div'); t.className='msg-text'; t.style.fontSize='24px'; t.textContent=m.content; bubble.appendChild(t); }
  }
  else { const t=document.createElement('div'); t.className='msg-text'; t.textContent=m.content; bubble.appendChild(t); }
  const meta=document.createElement('div'); meta.className='msg-meta'; meta.textContent=(m.sender_name||('User '+m.sender_id))+(m.edited_at?' • edited':''); bubble.appendChild(meta);
  const actions=document.createElement('div'); actions.className='msg-actions';
  if(isMe){
    const btnE=document.createElement('button'); btnE.className='btn-icon'; btnE.textContent='Edit'; btnE.onclick=async()=>{ const v=prompt('Edit message', m.content||''); if(v==null) return; if(!v.trim()) return; try{ await window.API.chat.public.update(m.id, v.trim()); pubAfterId=0; pubList.innerHTML=''; }catch{ notify('Failed to edit'); } };
    const btnD=document.createElement('button'); btnD.className='btn-icon'; btnD.textContent='Delete'; btnD.onclick=async()=>{ try{ await window.API.chat.public.remove(m.id); pubAfterId=0; pubList.innerHTML=''; }catch{ notify('Failed to delete'); } };
    actions.appendChild(btnE); actions.appendChild(btnD);
  }
  bubble.appendChild(actions); wrap.appendChild(bubble); return wrap;
}
function appendPub(m){ pubList.appendChild(renderBubble(m)); pubList.scrollTop=pubList.scrollHeight; }
async function pollPublic(){try{const items=await window.API.chat.public.list(pubAfterId);if(Array.isArray(items)&&items.length){items.forEach(m=>{appendPub(m);pubAfterId=Math.max(pubAfterId, Number(m.id)||0);});}}catch{} finally{pubTimer=setTimeout(pollPublic,2000);} }
function startPublic(){if(pubTimer) clearTimeout(pubTimer); pubTimer=setTimeout(pollPublic,50);} 
pubSend&&pubSend.addEventListener('click', async ()=>{const t=(pubInput.value||'').trim(); if(!t) return; try{const m=await window.API.chat.public.send(t,'text'); pubInput.value=''; appendPub({id:m.id, sender_id:(DB.session()?.user?.id), sender_name:(DB.session()?.user?.name), content:t, kind:'text'}); pubAfterId=Math.max(pubAfterId, Number(m.id)||0);}catch(err){notify('Failed to send');}});
startPublic();

const chatModal=document.getElementById('chatModal');
const privList=document.getElementById('privChatList');
const privInput=document.getElementById('privChatInput');
const btnSendPriv=document.getElementById('btnSendPriv');
const btnClosePriv=document.getElementById('btnClosePriv');
let currentOther=null; let currentListing=null; let privAfterId=0; let privTimer=null;
function renderPrivBubble(m){
  const meId=DB.session()?.user?.id; const isMe=m.sender_id===meId;
  const wrap=document.createElement('div'); wrap.className='chat-msg'+(isMe?' me':'');
  const bubble=document.createElement('div'); bubble.className='msg-bubble';
  if(m.deleted_at){ const t=document.createElement('div'); t.className='msg-text'; t.textContent='(message deleted)'; bubble.appendChild(t); }
  else { const t=document.createElement('div'); t.className='msg-text'; t.textContent=m.content||''; bubble.appendChild(t); }
  const meta=document.createElement('div'); meta.className='msg-meta'; meta.textContent=(m.sender_name||('User '+m.sender_id))+(m.edited_at?' • edited':''); bubble.appendChild(meta);
  const actions=document.createElement('div'); actions.className='msg-actions';
  if(isMe){
    const btnE=document.createElement('button'); btnE.className='btn-icon'; btnE.textContent='Edit'; btnE.onclick=async()=>{ const v=prompt('Edit message', m.content||''); if(v==null) return; if(!v.trim()) return; try{ await window.API.chat.private.update(m.id, v.trim()); privAfterId=0; privList.innerHTML=''; }catch{ notify('Failed to edit'); } };
    const btnD=document.createElement('button'); btnD.className='btn-icon'; btnD.textContent='Delete'; btnD.onclick=async()=>{ try{ await window.API.chat.private.remove(m.id); privAfterId=0; privList.innerHTML=''; }catch{ notify('Failed to delete'); } };
    actions.appendChild(btnE); actions.appendChild(btnD);
  }
  bubble.appendChild(actions); wrap.appendChild(bubble); return wrap;
}
function appendPriv(m){ privList.appendChild(renderPrivBubble(m)); privList.scrollTop=privList.scrollHeight; }
async function pollPrivate(){if(!currentOther||!currentListing){return;} try{const items=await window.API.chat.private.list(currentListing, currentOther, privAfterId); if(Array.isArray(items)&&items.length){items.forEach(m=>{appendPriv(m); privAfterId=Math.max(privAfterId, Number(m.id)||0);});}}catch{} finally{privTimer=setTimeout(pollPrivate, 2000);} }
function openPrivateChat(listingId, otherId){ currentListing=listingId; currentOther=otherId; privAfterId=0; privList.innerHTML=''; chatModal.classList.remove('hidden'); if(privTimer) clearTimeout(privTimer); privTimer=setTimeout(pollPrivate, 80); }
btnSendPriv&&btnSendPriv.addEventListener('click', async ()=>{const t=(privInput.value||'').trim(); if(!t||!currentOther||!currentListing) return; try{const m=await window.API.chat.private.send(currentListing, currentOther, t); privInput.value=''; appendPriv({id:m.id, sender_id:(DB.session()?.user?.id), sender_name:(DB.session()?.user?.name), content:t}); privAfterId=Math.max(privAfterId, Number(m.id)||0);}catch(err){notify('Failed to send');}});
btnClosePriv&&btnClosePriv.addEventListener('click', ()=>{ if(privTimer) clearTimeout(privTimer); chatModal.classList.add('hidden'); currentOther=null; currentListing=null; });

// view details modal logic (read-only)
const vModal=document.querySelector('#viewModal');
const vTitle=document.querySelector('#vTitle');
const vPhoto=document.querySelector('#vPhoto');
const vMeta=document.querySelector('#vMeta');
const vDesc=document.querySelector('#vDesc');
const vAddr=document.querySelector('#vAddr');
const vLinks=document.querySelector('#vLinks');
const btnCloseView=document.querySelector('#btnCloseView');
function openView(it){
  if(!vModal) return;
  vTitle.textContent=it.title||'Listing Details';
  const photo=(Array.isArray(it.images)&&it.images[0])||''; vPhoto.src=photo||placeholderImg();
  vMeta.textContent=`${money(it.price)} / mo • ${it.beds??0} BR • ${it.baths??0} BA • ${it.city||'Unknown'}`;
  vDesc.textContent=it.description||'';
  vAddr.textContent=it.address? (`Address: ${it.address}`) : '';
  vLinks.innerHTML='';
  if(it.lat!=null && it.lng!=null){
    const a=document.createElement('a');
    a.className='btn btn-ghost';
    a.textContent='Open in Maps';
    a.href=`https://www.google.com/maps?q=${it.lat},${it.lng}`;
    a.target='_blank';
    vLinks.appendChild(a);
  }
  vModal.classList.remove('hidden');
}
btnCloseView&&btnCloseView.addEventListener('click',()=>vModal.classList.add('hidden'));

// notify modal helper for user
function notify(message, onOk){
  const m=document.getElementById('notifyModal');
  const t=document.getElementById('notifyText');
  const ok=document.getElementById('notifyOk');
  if(!m||!t||!ok){ alert(message); return; }
  t.textContent=message; m.classList.remove('hidden');
  function close(){ m.classList.add('hidden'); ok.removeEventListener('click', close); if(onOk) onOk(); }
  ok.addEventListener('click', close);
}

// API health badge
(function(){
  const st=document.getElementById("apiStatus");
  if(!st||!window.APP_CONFIG) return;
  const url=(window.APP_CONFIG.API_BASE||"")+"/api/health";
  function ping(){
    fetch(url,{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then(()=>{
      st.textContent="Online"; st.classList.remove("down"); st.classList.add("ok");
    }).catch(()=>{
      st.textContent="Offline"; st.classList.remove("ok"); st.classList.add("down");
    });
  }
  ping(); setInterval(ping,10000);
})();
