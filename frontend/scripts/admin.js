// --- Database handling using localStorage ---
const DB = {
  kSession: "RE_session",
  read(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } },
  session(){ try{ return JSON.parse(localStorage.getItem(this.kSession)); }catch{ return null; } },
  guard(){ const s=this.session(); if(!s || s.role!=="admin"){ window.location.href = "../index.html"; } }
};
DB.guard();

function uid(){ return crypto.randomUUID ? crypto.randomUUID() : Date.now()+Math.random(); }
function nowISO(){ return new Date().toISOString(); }
function money(v){ const n=Number(v); return Number.isNaN(n)?v:"₱"+n.toLocaleString(); }
function placeholderImg(t="No Photo"){return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='#111827'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#6b7280' font-size='12'>${t}</text></svg>`);} 

async function getListings(){ return window.API.listings.list(); }

// --- UI toggling logic ---
const postView = document.getElementById("postView");
const listingsView = document.getElementById("listingsView");

document.getElementById("btnPost").addEventListener("click", () =>{
  postView.style.display = "block";
  listingsView.style.display = "none";
  // ensure Leaflet map recalculates size when container becomes visible
  setTimeout(()=>{ if(window.__mapCreate){ window.__mapCreate.invalidateSize(); } }, 80);
});

// --- Leaflet Maps (Create / Edit) ---
(function initMaps(){
  if(typeof L==='undefined') return;
  // Create map for Post form
  const elCreate = document.getElementById('mapCreate');
  if(elCreate){
    const center=[12.8797,121.7740]; // PH centroid default
    const map=L.map(elCreate).setView(center,6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'&copy; OpenStreetMap' }).addTo(map);
    const marker=L.marker(center,{draggable:true}).addTo(map);
    function setHidden(ll){
      const la=document.getElementById('latCreate');
      const ln=document.getElementById('lngCreate');
      if(la&&ln){ la.value=ll.lat.toFixed(6); ln.value=ll.lng.toFixed(6);} }
    marker.on('moveend', e=> setHidden(e.target.getLatLng()));
    map.on('click', e=>{ marker.setLatLng(e.latlng); setHidden(e.latlng); });
    // initialize hidden values
    setHidden({lat:center[0], lng:center[1]});
    // expose for potential later access
    window.__mapCreate=map; window.__markerCreate=marker;

    // search wiring (Nominatim)
    const sInp=document.getElementById('mapCreateSearch');
    const sBtn=document.getElementById('mapCreateFind');
    async function geocodeAndSet(){
      const q=(sInp&&sInp.value||'').trim(); if(!q) return;
      try{
        const res=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(q),{headers:{'Accept-Language':'en'}});
        const data=await res.json(); if(!Array.isArray(data)||!data.length) { notify('Location not found'); return; }
        const {lat,lon}=data[0]; const ll={lat:parseFloat(lat), lng:parseFloat(lon)};
        map.setView([ll.lat,ll.lng], 14); marker.setLatLng(ll); setHidden(ll);
      }catch{ notify('Search failed'); }
    }
    sBtn&&sBtn.addEventListener('click', geocodeAndSet);
    sInp&&sInp.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); geocodeAndSet(); }});
    const locInp=document.querySelector('input[name="location"]');
    if(locInp&&sInp){
      sInp.value=locInp.value||'';
      locInp.addEventListener('input', ()=>{ sInp.value=locInp.value; });
    }
  }
  // Edit modal map (created once)
  const elEdit=document.getElementById('mapEdit');
  if(elEdit){
    const center=[12.8797,121.7740];
    const map=L.map(elEdit).setView(center,6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'&copy; OpenStreetMap' }).addTo(map);
    const marker=L.marker(center,{draggable:true}).addTo(map);
    function setHidden(ll){
      const la=document.getElementById('eLat');
      const ln=document.getElementById('eLng');
      if(la&&ln){ la.value=ll.lat.toFixed(6); ln.value=ll.lng.toFixed(6);} }
    marker.on('moveend', e=> setHidden(e.target.getLatLng()));
    map.on('click', e=>{ marker.setLatLng(e.latlng); setHidden(e.latlng); });
    window.__mapEdit=map; window.__markerEdit=marker;

    // search wiring for edit
    const sInp=document.getElementById('mapEditSearch');
    const sBtn=document.getElementById('mapEditFind');
    async function geocodeAndSet(){
      const q=(sInp&&sInp.value||'').trim(); if(!q) return;
      try{
        const res=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(q),{headers:{'Accept-Language':'en'}});
        const data=await res.json(); if(!Array.isArray(data)||!data.length) return alert('Location not found');
        const {lat,lon}=data[0]; const ll={lat:parseFloat(lat), lng:parseFloat(lon)};
        map.setView([ll.lat,ll.lng], 14); marker.setLatLng(ll); setHidden(ll);
      }catch{ alert('Search failed'); }
    }
    sBtn&&sBtn.addEventListener('click', geocodeAndSet);
    sInp&&sInp.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); geocodeAndSet(); }});
  }
})();

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

document.getElementById("btnManage").addEventListener("click", ()=>{
  listingsView.style.display = "block";
  postView.style.display = "none";
  refresh();
});

document.getElementById("btnLogout").addEventListener("click", ()=>{
  localStorage.removeItem(DB.kSession);
  window.location.href = "../index.html";
});

// --- Rendering Listings ---
function render(items){
  const list=document.getElementById("list");
  const empty=document.getElementById("empty");
  list.innerHTML="";
  if(!items.length){ empty.style.display="block"; return; }
  empty.style.display="none";

  items.forEach(it=>{
    const card=document.createElement("div");
    card.className="card-item";
    const status=(it.status||'available');
    const pill=document.createElement("span");
    pill.className=`badge pill ${status}`;
    pill.textContent=status==='rented'?'Rented':'Available';
    card.appendChild(pill);

    const img=document.createElement("img");
    img.className="thumb";
    const photo=(Array.isArray(it.images)&&it.images[0])||it.photo||"";
    img.src=photo||placeholderImg();
    img.onerror=()=>img.src=placeholderImg();
    card.appendChild(img);

    const body=document.createElement("div");
    const top=document.createElement("div");
    const title=document.createElement("div");
    title.className="title";
    title.textContent=it.title;
    top.appendChild(title);
    body.appendChild(top);

    const meta=document.createElement("div");
    meta.className="meta";
    meta.textContent=`${money(it.price)} / mo • ${it.beds??0} BR • ${it.baths??0} BA • ${it.city||"Unknown"}`;
    body.appendChild(meta);

    if(it.description){
      const d=document.createElement("div");
      d.textContent=it.description;
      body.appendChild(d);
    }

    const actions=document.createElement("div");
    actions.className="actions-inline";

    const btnEdit=document.createElement("button");
    btnEdit.className="btn btn-ghost";
    btnEdit.textContent="Edit";
    btnEdit.onclick=()=>openEdit(it);
    actions.appendChild(btnEdit);

    const btnDel=document.createElement("button");
    btnDel.className="btn btn-danger";
    btnDel.textContent="Delete";
    btnDel.onclick=async()=>{
     try{
       const ok = await confirmDialog("Delete this listing?");
       if(!ok) return;
       await window.API.listings.remove(it.id);
       refresh();
     }catch(err){
       notify("Delete failed");
     }
   };
    actions.appendChild(btnDel);

    body.appendChild(actions);
    card.appendChild(body);
    list.appendChild(card);
  });
}

// --- admin search wiring ---
(function(){
  const inp=document.getElementById('adminSearch');
  const clr=document.getElementById('adminSearchClear');
  if(!inp) return;
  let to=null;
  function onChange(){ clearTimeout(to); to=setTimeout(applyAdminSearch, 120); }
  inp.addEventListener('input', onChange);
  clr&&clr.addEventListener('click', ()=>{ inp.value=''; applyAdminSearch(); });
})();

let __allItems = [];
async function refresh(){
  try{
    const list=await getListings();
    list.sort((a,b)=>new Date(b.created_at||b.createdAt)-new Date(a.created_at||a.createdAt));
    __allItems = list;
    applyAdminSearch();
  }catch{ __allItems=[]; render([]); }
}

function applyAdminSearch(){
  const q=(document.getElementById('adminSearch')?.value||'').trim().toLowerCase();
  if(!q){ render(__allItems); return; }
  const filtered=__allItems.filter(it=>{
    const title=(it.title||'').toLowerCase();
    const city=(it.city||'').toLowerCase();
    const desc=(it.description||'').toLowerCase();
    return title.includes(q)||city.includes(q)||desc.includes(q);
  });
  render(filtered);
}

// --- Post a Rental form submission ---
document.getElementById("formCreate").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const sess=DB.session&&DB.session();
  if(!sess||!sess.token){ notify("Your session has expired. Please login again.", ()=>{ window.location.href = "../index.html"; }); return; }
  const fd = new FormData(e.currentTarget);
  const d = Object.fromEntries(fd.entries());
  const file = document.getElementById("photoFile").files[0];
  let photo="";
  if(file){
    if(file.size > 4.5 * 1024 * 1024){ notify("Image is too large. Please choose a file under 4.5 MB."); return; }
    photo=await new Promise(r=>{
      const fr=new FileReader();
      fr.onload=()=>r(fr.result);
      fr.readAsDataURL(file);
    });
  }

  const payload={
    title:d.title,
    description:d.description,
    price:Number(d.price),
    beds:Number(d.bedrooms||0),
    baths:0,
    city:d.location||'',
    address:'',
    lat: (document.getElementById("latCreate").value? Number(document.getElementById("latCreate").value): null),
    lng: (document.getElementById("lngCreate").value? Number(document.getElementById("lngCreate").value): null),
    status:'available',
    images: photo? [photo]: []
  };
  try{
    await window.API.listings.create(payload);
    e.target.reset();
    notify("Listing added successfully!");
    refresh();
  }catch(err){
    notify((err && err.message) ? ("Failed to add listing: "+err.message) : "Failed to add listing.");
  }
});

// initial load of listings on dashboard
refresh();

// --- Edit Modal Logic ---
const editModal=document.getElementById("editModal");
const eId=document.getElementById("eId");
const eTitle=document.getElementById("eTitle");
const ePrice=document.getElementById("ePrice");
const eLocation=document.getElementById("eLocation");
const eBedrooms=document.getElementById("eBedrooms");
const eBaths=document.getElementById("eBaths");
const eStatus=document.getElementById("eStatus");
const eAddress=document.getElementById("eAddress");
const eDescription=document.getElementById("eDescription");
const ePhotoFile=document.getElementById("ePhotoFile");
const btnCancelEdit=document.getElementById("btnCancelEdit");

function openEdit(it){
  eId.value=it.id;
  eTitle.value=it.title||"";
  ePrice.value=it.price||0;
  eLocation.value=it.city||"";
  eBedrooms.value=it.beds??0;
  eBaths.value=it.baths??0;
  eStatus.value=(it.status||'available');
  eAddress.value=it.address||"";
  eDescription.value=it.description||"";
  ePhotoFile.value="";
  // set edit lat/lng hidden
  document.getElementById("eLat").value = (it.lat!=null? it.lat: "");
  document.getElementById("eLng").value = (it.lng!=null? it.lng: "");
  editModal.classList.remove("hidden");
  // ensure map renders
  setTimeout(()=>{
    if(window.__mapEdit){
      window.__mapEdit.invalidateSize();
      // set marker position to current values or default
      const lat = parseFloat(document.getElementById("eLat").value);
      const lng = parseFloat(document.getElementById("eLng").value);
      const hasPos = !Number.isNaN(lat) && !Number.isNaN(lng);
      const pos = hasPos ? [lat,lng] : [12.8797,121.7740];
      window.__mapEdit.setView(pos, hasPos? 14: 6);
      if(window.__markerEdit){ window.__markerEdit.setLatLng(pos); }
    }
  }, 80);
}

btnCancelEdit&&btnCancelEdit.addEventListener("click",()=>{
  editModal.classList.add("hidden");
});

document.getElementById("editForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const id=eId.value;
  // optional photo replacement
  const file=ePhotoFile.files && ePhotoFile.files[0];
  let newImageList=null;
  if(file){
    if(file.size > 4.5*1024*1024){ alert("Image is too large. Please choose a file under 4.5 MB."); return; }
    newImageList=await new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>res([fr.result]); fr.readAsDataURL(file); });
  }
  const payload={
    title: eTitle.value.trim(),
    price: Number(ePrice.value),
    city: eLocation.value.trim(),
    beds: Number(eBedrooms.value||0),
    baths: Number(eBaths.value||0),
    status: eStatus.value,
    address: eAddress.value.trim(),
    description: eDescription.value.trim(),
    lat: (document.getElementById("eLat").value? Number(document.getElementById("eLat").value): null),
    lng: (document.getElementById("eLng").value? Number(document.getElementById("eLng").value): null)
  };
  if(newImageList){ payload.images=newImageList; }
  try{
    await window.API.listings.update(id, payload);
    editModal.classList.add("hidden");
    refresh();
  }catch(err){
    notify((err && err.message) ? ("Failed to update listing: "+err.message) : "Failed to update listing.");
  }
});

// --- notify modal helper ---
function notify(message, onOk){
  const m=document.getElementById('notifyModal');
  const t=document.getElementById('notifyText');
  const ok=document.getElementById('notifyOk');
  if(!m||!t||!ok){ alert(message); return; }
  t.textContent=message; m.classList.remove('hidden');
  function close(){ m.classList.add('hidden'); ok.removeEventListener('click', close); if(onOk) onOk(); }
  ok.addEventListener('click', close);
}

// --- confirm modal helper ---
function confirmDialog(message){
  return new Promise((resolve)=>{
    const m=document.getElementById('confirmModal');
    const t=document.getElementById('confirmText');
    const ok=document.getElementById('confirmOk');
    const cancel=document.getElementById('confirmCancel');
    if(!m||!t||!ok||!cancel){
      const r=window.confirm(message);
      resolve(r);
      return;
    }
    t.textContent=message;
    m.classList.remove('hidden');
    function cleanup(){
      ok.removeEventListener('click',onOk);
      cancel.removeEventListener('click',onCancel);
    }
    function close(){ m.classList.add('hidden'); cleanup(); }
    function onOk(){ close(); resolve(true); }
    function onCancel(){ close(); resolve(false); }
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
  });
}

// Recalculate Leaflet map sizes on window resize (prevents partial white tiles)
(function(){
  let to=null;
  window.addEventListener('resize', ()=>{
    clearTimeout(to);
    to=setTimeout(()=>{
      if(window.__mapCreate){ window.__mapCreate.invalidateSize(); }
      if(window.__mapEdit){ window.__mapEdit.invalidateSize(); }
    }, 120);
  });
})();

const pubAList=document.getElementById('pubAList');
const pubAInput=document.getElementById('pubAInput');
const pubASend=document.getElementById('pubASend');
let pubAAfterId=0; let pubATimer=null;
const A_STICKERS=['👍','😊','❤️','😢','😮'];
// augment input row with buttons and sticker picker
const aInputRow=pubASend?.parentElement; let aFileBtn=null, aFileInp=null, aStkBtn=null, aStkPicker=null; let aStkOpen=false;
if(aInputRow){
  aFileBtn=document.createElement('button'); aFileBtn.type='button'; aFileBtn.className='btn-icon'; aFileBtn.textContent='Image';
  aFileInp=document.createElement('input'); aFileInp.type='file'; aFileInp.accept='image/*'; aFileInp.style.display='none';
  aStkBtn=document.createElement('button'); aStkBtn.type='button'; aStkBtn.className='btn-icon'; aStkBtn.textContent='Stickers';
  aStkPicker=document.createElement('div'); aStkPicker.className='sticker-picker'; aStkPicker.style.display='none';
  const grid=document.createElement('div'); grid.className='sticker-grid';
  A_STICKERS.forEach(em=>{ const btn=document.createElement('button'); btn.type='button'; btn.textContent=em; btn.onclick=async()=>{ try{ await window.API.chat.public.send(em,'sticker'); hideASticker(); }catch{ notify('Failed to send.'); } }; grid.appendChild(btn); });
  aStkPicker.appendChild(grid);
  aInputRow.parentElement.appendChild(aStkPicker);
  // Order: input | Send | Stickers | Image
  aInputRow.appendChild(pubASend);
  aInputRow.appendChild(aStkBtn);
  aInputRow.appendChild(aFileBtn);
  aInputRow.appendChild(aFileInp);
  aFileBtn.onclick=()=>aFileInp.click();
  function hideASticker(){ aStkOpen=false; aStkPicker.style.display='none'; }
  aStkBtn.onclick=()=>{ aStkOpen=!aStkOpen; aStkPicker.style.display= aStkOpen?'block':'none'; };
  aFileInp.onchange=async(e)=>{
    const f=e.target.files && e.target.files[0]; if(!f) return; if(f.size>4.5*1024*1024){ notify('Image is too large. Max 4.5MB'); return; }
    try{
      const b64=await new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(f); });
      await window.API.chat.public.send(String(b64),'image'); aFileInp.value='';
    }catch{ notify('Failed to send.'); }
  };
}
function renderPubBubble(m){
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
    const btnE=document.createElement('button'); btnE.className='btn-icon'; btnE.textContent='Edit'; btnE.onclick=async()=>{ const v=prompt('Edit message', m.content||''); if(v==null) return; if(!v.trim()) return; try{ await window.API.chat.public.update(m.id, v.trim()); pubAAfterId=0; pubAList.innerHTML=''; }catch{ notify('Failed to edit.'); } };
    const btnD=document.createElement('button'); btnD.className='btn-icon'; btnD.textContent='Delete'; btnD.onclick=async()=>{ try{ await window.API.chat.public.remove(m.id); pubAAfterId=0; pubAList.innerHTML=''; }catch{ notify('Failed to delete.'); } };
    actions.appendChild(btnE); actions.appendChild(btnD);
  }
  bubble.appendChild(actions); wrap.appendChild(bubble); return wrap;
}
function appendPubA(m){ pubAList.appendChild(renderPubBubble(m)); pubAList.scrollTop=pubAList.scrollHeight; }
async function pollPubA(){ try{ const items=await window.API.chat.public.list(pubAAfterId); if(Array.isArray(items)&&items.length){ items.forEach(m=>{ appendPubA(m); pubAAfterId=Math.max(pubAAfterId, Number(m.id)||0); }); } }catch{} finally{ pubATimer=setTimeout(pollPubA, 2000); } }
function startPubA(){ if(pubATimer) clearTimeout(pubATimer); pubATimer=setTimeout(pollPubA, 80); }
pubASend&&pubASend.addEventListener('click', async ()=>{ const t=(pubAInput.value||'').trim(); if(!t) return; try{ const m=await window.API.chat.public.send(t,'text'); pubAInput.value=''; appendPubA({id:m.id, sender_id:(DB.session()?.user?.id), sender_name:(DB.session()?.user?.name), content:t, kind:'text'}); pubAAfterId=Math.max(pubAAfterId, Number(m.id)||0); }catch{ notify('Failed to send.'); } });
startPubA();

const threadsList=document.getElementById('threadsList');
const privAList=document.getElementById('privAList');
const privAInput=document.getElementById('privAInput');
const privASend=document.getElementById('privASend');
let currentOtherA=null; let currentListingA=null; let privAAfterId=0; let privATimer=null; let thrTimer=null;
function renderPrivABubble(m){ const meId=DB.session()?.user?.id; const isMe=m.sender_id===meId; const wrap=document.createElement('div'); wrap.className='chat-msg'+(isMe?' me':''); const bubble=document.createElement('div'); bubble.className='msg-bubble'; if(m.deleted_at){ const t=document.createElement('div'); t.className='msg-text'; t.textContent='(message deleted)'; bubble.appendChild(t); } else { const t=document.createElement('div'); t.className='msg-text'; t.textContent=m.content||''; bubble.appendChild(t); } const meta=document.createElement('div'); meta.className='msg-meta'; meta.textContent=(m.sender_name||('User '+m.sender_id))+(m.edited_at?' • edited':''); bubble.appendChild(meta); const actions=document.createElement('div'); actions.className='msg-actions'; if(isMe){ const btnE=document.createElement('button'); btnE.className='btn-icon'; btnE.textContent='Edit'; btnE.onclick=async()=>{ const v=prompt('Edit message', m.content||''); if(v==null) return; if(!v.trim()) return; try{ await window.API.chat.private.update(m.id, v.trim()); privAAfterId=0; privAList.innerHTML=''; }catch{ notify('Failed to edit.'); } }; const btnD=document.createElement('button'); btnD.className='btn-icon'; btnD.textContent='Delete'; btnD.onclick=async()=>{ try{ await window.API.chat.private.remove(m.id); privAAfterId=0; privAList.innerHTML=''; }catch{ notify('Failed to delete.'); } }; actions.appendChild(btnE); actions.appendChild(btnD); } bubble.appendChild(actions); wrap.appendChild(bubble); return wrap; }
function appendPrivA(m){ privAList.appendChild(renderPrivABubble(m)); privAList.scrollTop=privAList.scrollHeight; }
async function pollPrivA(){ if(!currentOtherA||!currentListingA) return; try{ const items=await window.API.chat.private.list(currentListingA, currentOtherA, privAAfterId); if(Array.isArray(items)&&items.length){ items.forEach(m=>{ appendPrivA(m); privAAfterId=Math.max(privAAfterId, Number(m.id)||0); }); } }catch{} finally{ privATimer=setTimeout(pollPrivA, 2000); } }
function selectThread(listingId, otherId){ currentListingA=listingId; currentOtherA=otherId; privAAfterId=0; privAList.innerHTML=''; if(privATimer) clearTimeout(privATimer); privATimer=setTimeout(pollPrivA, 80); }
async function loadThreads(){
  try{
    const ts=await window.API.chat.private.threads();
    threadsList.innerHTML='';
    (ts||[]).forEach(t=>{
      const item=document.createElement('div');
      item.className='thread-card';
      const title=document.createElement('div');
      title.className='thread-title';
      title.textContent=t.listing_title||('Listing #'+t.listing_id);
      const sub=document.createElement('div');
      sub.className='thread-sub';
      sub.textContent='From: '+(t.other_name||('User '+t.other_id));
      const snip=document.createElement('div');
      snip.className='thread-snippet';
      snip.textContent=t.last_content||'';
      const meta=document.createElement('div');
      meta.className='thread-meta';
      meta.textContent=t.last_time? new Date(t.last_time).toLocaleString(): '';
      item.appendChild(title);
      item.appendChild(sub);
      item.appendChild(snip);
      item.appendChild(meta);
      item.onclick=()=>selectThread(t.listing_id, t.other_id);
      threadsList.appendChild(item);
    });
  }catch{}
}
function startThreads(){ if(thrTimer) clearTimeout(thrTimer); async function tick(){ try{ await loadThreads(); }finally{ thrTimer=setTimeout(tick, 5000); } } thrTimer=setTimeout(tick, 100); }
privASend&&privASend.addEventListener('click', async ()=>{ const t=(privAInput.value||'').trim(); if(!t||!currentOtherA||!currentListingA) return; try{ const m=await window.API.chat.private.send(currentListingA, currentOtherA, t); privAInput.value=''; appendPrivA({id:m.id, sender_id:(DB.session()?.user?.id), sender_name:(DB.session()?.user?.name), content:t}); privAAfterId=Math.max(privAAfterId, Number(m.id)||0); }catch{ notify('Failed to send.'); } });
startThreads();
