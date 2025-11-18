(function(){
  const form=document.getElementById('formRegister');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd=new FormData(form);
    const name=String(fd.get('name')||'').trim();
    const email=String(fd.get('email')||'').trim();
    const password=String(fd.get('password')||'').trim();
    if(!name||!email||!password){ notify('Please fill all fields.'); return; }
    try{
      await window.API.register(name,email,password);
      notify('Account created. You can now login.', ()=>{ window.location.href='./index.html'; });
    }catch(err){
      notify('Registration failed');
    }
  });
  function notify(message,onOk){const m=document.getElementById('notifyModal'),t=document.getElementById('notifyText'),ok=document.getElementById('notifyOk');if(!m||!t||!ok){alert(message);return;}t.textContent=message;m.classList.remove('hidden');function close(){m.classList.add('hidden');ok.removeEventListener('click',close);if(onOk)onOk();}ok.addEventListener('click',close);}
})();
