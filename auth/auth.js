// JavaScript / auth/auth.js / modern browsers / local Vulpi authentication screens
(()=>{
 const path=location.pathname.replace(/\/+$/,'');
 const resetting=path==='/reset-password';
 const mode=['/register','/cadastro'].includes(path)?'register':['/forgot-password','/recuperar-senha','/reset-password'].includes(path)?'recovery':'login';
 const forms={login:document.querySelector('#login-form'),register:document.querySelector('#register-form'),recovery:document.querySelector('#recovery-form')};
 const titles={login:['Boas-vindas de volta!','Estamos muito animados em te ver novamente!'],register:['Criar uma conta',''],recovery:['Vamos recuperar seu acesso','Informe o e-mail associado à sua conta.']};
 for(const [name,form] of Object.entries(forms))form.hidden=name!==mode;
 document.querySelector('#page-title').textContent=titles[mode][0];document.querySelector('#page-subtitle').textContent=titles[mode][1];
 document.title=(mode==='register'?'Criar conta':mode==='recovery'?'Recuperar acesso':'Entrar')+' · Vulpi';document.querySelector('#auth-shell').classList.add(mode+'-mode');
 const eye='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
 const eyeOff='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m3 3 18 18M10.6 5.1A12 12 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.7M6.2 6.2A19 19 0 0 0 2 12s3.5 7 10 7a13 13 0 0 0 5.8-1.5M10 10a3 3 0 0 0 4 4"/></svg>';
 document.querySelectorAll('[data-toggle]').forEach(button=>{button.innerHTML=eye;button.addEventListener('click',()=>{const input=document.getElementById(button.dataset.toggle),visible=input.type==='password';input.type=visible?'text':'password';button.setAttribute('aria-label',visible?'Ocultar senha':'Mostrar senha');button.setAttribute('aria-pressed',String(visible));button.innerHTML=visible?eyeOff:eye;});});
 const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 for(let day=1;day<=31;day++)document.querySelector('#birth-day').add(new Option(String(day),String(day)));
 months.forEach((month,index)=>document.querySelector('#birth-month').add(new Option(month,String(index+1))));
 for(let year=new Date().getFullYear();year>=new Date().getFullYear()-120;year--)document.querySelector('#birth-year').add(new Option(String(year),String(year)));
 function error(input,message){input.setAttribute('aria-invalid',String(Boolean(message)));const label=input.getAttribute('aria-describedby');if(label)document.getElementById(label).textContent=message;return !message;}
 function email(input){const value=input.value.trim(),validEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),validPhone=mode==='login'&&/^[a-z0-9_.]{2,32}$/i.test(value);return error(input,!value?(mode==='login'?'Informe seu e-mail ou nome de usuário.':'Informe seu e-mail.'):!validEmail&&!validPhone?'Digite um e-mail válido'+(mode==='login'?' ou nome de usuário.':'.'):'');}
 const dialog=document.querySelector('#preview-dialog');
 document.querySelector('#passkey-button').addEventListener('click',()=>{document.querySelector('#dialog-title').textContent='Acesso com passkey';document.querySelector('#dialog-copy').textContent='O acesso com passkey não está conectado nesta prévia local do Vulpi.';dialog.showModal();});
 document.querySelector('#close-dialog').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
 if(resetting){forms.recovery.innerHTML='<label class="field"><span>Nova senha</span><input name="newPassword" type="password" required minlength="8" maxlength="256" autocomplete="new-password"></label><label class="field"><span>Código do autenticador (se ativado)</span><input name="code" autocomplete="one-time-code"></label><button class="primary-button" type="submit">Alterar senha</button>';document.querySelector('#page-title').textContent='Crie uma nova senha';document.querySelector('#page-subtitle').textContent='Atualize a senha da sua conta Vulpi.';}
 for(const form of Object.values(forms)){
  const status=document.createElement('p');status.className='server-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');form.append(status);
  form.addEventListener('input',event=>{if(event.target.hasAttribute('aria-describedby')&&event.target.getAttribute('aria-invalid')==='true')error(event.target,'');});
  form.addEventListener('submit',async event=>{
   event.preventDefault();let valid=true;
   const emailInput=form.querySelector('input[name="email"]');if(emailInput)valid=email(emailInput)&&valid;
   const password=form.querySelector('input[name="password"]');if(password)valid=error(password,!password.value?'Informe sua senha.':mode==='register'&&password.value.length<8?'Use pelo menos 8 caracteres.':'')&&valid;
   if(mode==='register'){
    const name=document.querySelector('#register-name');valid=error(name,name.value.trim()&&name.value.trim().length<2?'Use um nome com pelo menos 2 caracteres.':'')&&valid;
    const username=document.querySelector('#register-username');valid=error(username,/^[a-z0-9_.]{2,32}$/i.test(username.value.trim())?'':'Use de 2 a 32 letras, números, pontos ou sublinhados.')&&valid;
    const day=Number(document.querySelector('#birth-day').value),month=Number(document.querySelector('#birth-month').value),year=Number(document.querySelector('#birth-year').value);const birth=new Date(year,month-1,day);
    const dateValid=Boolean(day&&month&&year)&&birth.getFullYear()===year&&birth.getMonth()===month-1&&birth.getDate()===day&&birth<=new Date();
    document.querySelector('#birth-error').textContent=dateValid?'':'Selecione uma data de nascimento válida.';for(const select of document.querySelectorAll('.birthday select'))select.setAttribute('aria-invalid',String(!dateValid));valid=dateValid&&valid;
    valid=error(document.querySelector('#register-terms'),document.querySelector('#register-terms').checked?'':'É necessário aceitar os termos para continuar.')&&valid;
   }
   if(resetting&&form.querySelector('[name="newPassword"]').value.length<8){form.querySelector('.server-status').textContent='Use pelo menos 8 caracteres na nova senha.';return;}
   if(!valid){form.querySelector('[aria-invalid="true"]')?.focus();return;}
   const submit=form.querySelector('[type="submit"]');submit.disabled=true;
   const status=form.querySelector('.server-status');status.textContent='Conectando...';
   try{
    const payload=resetting?{token:new URLSearchParams(location.search).get('token'),password:form.querySelector('[name="newPassword"]').value,code:form.querySelector('[name="code"]')?.value}:mode==='register'?{email:emailInput.value.trim(),password:password.value,username:document.querySelector('#register-username').value.trim(),displayName:document.querySelector('#register-name').value.trim(),acceptTerms:document.querySelector('#register-terms').checked}:{email:emailInput.value.trim(),password:password?.value,code:form.querySelector('[name="code"]')?.value};
    const endpoint=resetting?'reset-password':form.dataset.reactivate==='true'?'reactivate':mode==='recovery'?'recovery':mode==='register'?'register':'login';
    const response=await fetch('/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});const result=await response.json();
    if(!response.ok){
     if(result.mfaRequired&&!form.querySelector('[name="code"]')){const label=document.createElement('label');label.className='field';label.innerHTML='<span>Código de autenticação ou recuperação</span><input name="code" autocomplete="one-time-code" required>';form.insertBefore(label,status);label.querySelector('input').focus();}
     if(result.reactivation){form.dataset.reactivate='true';submit.textContent='Reativar conta';if(!form.querySelector('[name="code"]')){const label=document.createElement('label');label.className='field';label.innerHTML='<span>Código de autenticação (se ativado)</span><input name="code" autocomplete="one-time-code">';form.insertBefore(label,status);}}
     throw Error(result.error||'Não foi possível concluir.');
    }
    if(mode==='recovery'){status.textContent=resetting?'Senha alterada. Entre com sua nova senha.':result.message;form.reset();if(resetting){setTimeout(()=>location.href='/login',1500);}return;}
    if(password)password.value='';sessionStorage.removeItem('biscord-profile');location.href='/channels/@me';
   }catch(e){status.textContent=e.message;}finally{submit.disabled=false;}

  });
 }
 if(!window.matchMedia('(max-width: 480px)').matches)forms[mode].querySelector('input')?.focus({preventScroll:true});
})();
