(function(){
  const form=document.getElementById('formRegister');
  const pwdInput=form?.querySelector('input[name="password"]');
  const pwdModal=document.getElementById('pwdModal');
  const pwdMeterFill=document.getElementById('pwdMeterFill');
  const pwdStrengthLabel=document.getElementById('pwdStrengthLabel');
  const pwdClose=document.getElementById('pwdClose');
  const ruleItems=pwdModal ? Array.from(pwdModal.querySelectorAll('.pwd-rules li')) : [];
  let pwdAutoHidden=false;

  function evaluatePassword(value){
    const pwd=String(value||'');
    const rules={
      length: pwd.length >= 8,
      lower: /[a-z]/.test(pwd),
      upper: /[A-Z]/.test(pwd),
      number: /\d/.test(pwd),
      symbol: /[^A-Za-z0-9]/.test(pwd)
    };
    const score=Object.values(rules).filter(Boolean).length;
    let label='Start typing to check strength.';
    let level='';
    if(pwd.length){
      if(score <= 2){ label='Weak password'; level='weak'; }
      else if(score === 3 || score === 4){ label='Medium strength'; level='medium'; }
      else{ label='Strong password'; level='strong'; }
    }
    const percent=Math.min(100, Math.round((score/5)*100));
    return {rules,score,label,level,percent,pwd};
  }

  function updatePasswordUI(){
    if(!pwdModal||!pwdInput) return;
    const result=evaluatePassword(pwdInput.value);
    if(pwdMeterFill){
      pwdMeterFill.style.width=`${result.percent}%`;
      if(result.level==='strong') pwdMeterFill.style.background='linear-gradient(90deg, #34d399, #22c55e)';
      else if(result.level==='medium') pwdMeterFill.style.background='linear-gradient(90deg, #f59e0b, #fbbf24)';
      else pwdMeterFill.style.background='linear-gradient(90deg, #ef4444, #f97316)';
    }
    if(pwdStrengthLabel){
      pwdStrengthLabel.textContent=result.label;
      pwdStrengthLabel.classList.remove('weak','medium','strong');
      if(result.level) pwdStrengthLabel.classList.add(result.level);
    }
    ruleItems.forEach((item)=>{
      const key=item.getAttribute('data-rule');
      if(!key) return;
      if(result.rules[key]) item.classList.add('is-met');
      else item.classList.remove('is-met');
    });
  }

  function showPwdModal(){
    if(!pwdModal) return;
    pwdAutoHidden=false;
    pwdModal.classList.remove('hidden');
  }

  function hidePwdModal(){
    if(!pwdModal) return;
    pwdAutoHidden=true;
    pwdModal.classList.add('hidden');
  }

  if(pwdInput){
    pwdInput.addEventListener('focus', ()=>{ showPwdModal(); updatePasswordUI(); });
    pwdInput.addEventListener('input', ()=>{ if(pwdAutoHidden) showPwdModal(); updatePasswordUI(); });
    pwdInput.addEventListener('blur', ()=>{
      setTimeout(()=>{ if(document.activeElement!==pwdInput) pwdModal?.classList.add('hidden'); }, 120);
    });
  }

  if(pwdClose){
    pwdClose.addEventListener('click', hidePwdModal);
  }

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
