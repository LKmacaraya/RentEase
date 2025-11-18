(function(){
  const DB={kSession:"RE_session",setSession(v){localStorage.setItem(this.kSession,JSON.stringify(v));}};
  const tabs=Array.from(document.querySelectorAll(".tab"));const panes={user:document.querySelector("#pane-user"),admin:document.querySelector("#pane-admin")};tabs.forEach(btn=>{btn.addEventListener("click",()=>{tabs.forEach(b=>b.classList.remove("active"));btn.classList.add("active");const tab=btn.dataset.tab;for(const [k,p] of Object.entries(panes))p.classList.toggle("active",k===tab);});});
  document.querySelector("#formUserLogin").addEventListener("submit",async(e)=>{e.preventDefault();const fd=new FormData(e.currentTarget);const email=String(fd.get("email")||"").trim();const password=String(fd.get("password")||"").trim();try{const resp=await window.API.login(email,password);DB.setSession({role:'user',username:resp.user?.name||email,token:resp.token,user:resp.user,at:Date.now()});window.location.href="./user/home.html";}catch(err){notify("Invalid credentials");}});
  document.querySelector("#formAdminLogin").addEventListener("submit",async(e)=>{e.preventDefault();const fd=new FormData(e.currentTarget);const email=String(fd.get("email")||"").trim();const password=String(fd.get("password")||"").trim();try{const resp=await window.API.login(email,password);DB.setSession({role:'admin',username:resp.user?.name||'admin',token:resp.token,user:resp.user,at:Date.now()});window.location.href="./admin/home.html";}catch(err){notify("Invalid credentials");}});

  const tUser=document.getElementById('toggleUserPwd');
  const pUser=document.getElementById('userPassword');
  if(tUser&&pUser){ tUser.addEventListener('click',()=>{ const isPwd=pUser.type==='password'; pUser.type=isPwd?'text':'password'; }); }
  const tAdm=document.getElementById('toggleAdminPwd');
  const pAdm=document.getElementById('adminPassword');
  if(tAdm&&pAdm){ tAdm.addEventListener('click',()=>{ const isPwd=pAdm.type==='password'; pAdm.type=isPwd?'text':'password'; }); }
  const st=document.getElementById("apiStatus");if(st&&window.APP_CONFIG){const url=(window.APP_CONFIG.API_BASE||"")+"/api/health";function ping(){fetch(url,{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then(()=>{st.textContent="Online";st.classList.remove("down");st.classList.add("ok");}).catch(()=>{st.textContent="Offline";st.classList.remove("ok");st.classList.add("down");});}
  ping();setInterval(ping,10000);} 

  function notify(message,onOk){const m=document.getElementById('notifyModal'),t=document.getElementById('notifyText'),ok=document.getElementById('notifyOk');if(!m||!t||!ok){alert(message);return;}t.textContent=message;m.classList.remove('hidden');function close(){m.classList.add('hidden');ok.removeEventListener('click',close);if(onOk)onOk();}ok.addEventListener('click',close);} 
})();
