const DB={kSession:"RE_session",session(){try{return JSON.parse(localStorage.getItem(this.kSession));}catch{return null;}},guard(){const s=this.session();if(!s||s.role!=="user"){window.location.href="../index.html";}}};
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
    const msg=document.createElement("button");msg.className="btn btn-primary";msg.textContent="Message Owner";msg.onclick=()=>openModal("");act.appendChild(msg);
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

document.querySelector("#btnApply").addEventListener("click",applyFilters);
document.querySelector("#btnClear").addEventListener("click",()=>{["#fLocation","#fBedrooms","#fMinPrice","#fMaxPrice","#fStatus","#fQuery"].forEach(s=>document.querySelector(s).value="");applyFilters();});
document.querySelector("#btnLogout").addEventListener("click",()=>{localStorage.removeItem(DB.kSession);window.location.href="../index.html";});
applyFilters();

// modal logic
const modal=document.querySelector("#msgModal"),msgBox=document.querySelector("#msgText"),btnSend=document.querySelector("#btnSendMsg"),btnCall=document.querySelector("#btnCallOwner"),btnCancel=document.querySelector("#btnCancelMsg");
function openModal(phone){modal.classList.remove("hidden");msgBox.value="";btnCall.href="tel:"+phone;}
btnSend.onclick=()=>{if(msgBox.value.trim()===""){notify("Please enter a message.");return;}notify("Message sent successfully!");modal.classList.add("hidden");};
btnCancel.onclick=()=>modal.classList.add("hidden");

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
