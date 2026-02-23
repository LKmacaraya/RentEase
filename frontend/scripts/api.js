(function(){
  const K='RE_session';
  function session(){ try{ return JSON.parse(localStorage.getItem(K)); }catch{ return null; } }
  function setSession(v){ localStorage.setItem(K, JSON.stringify(v)); }
  async function request(path,{method='GET',headers={},body}={}){
    const base=(window.APP_CONFIG&&window.APP_CONFIG.API_BASE)||'';
    const url=base+path;
    const s=session();
    const h={ 'Content-Type':'application/json', ...headers };
    if(s&&s.token){ h['Authorization']='Bearer '+s.token; }
    const res=await fetch(url,{method,headers:h,body: body?JSON.stringify(body):undefined});
    if(!res.ok){ const t=await res.text().catch(()=>'' ); throw new Error(t||('HTTP '+res.status)); }
    const ct=res.headers.get('content-type')||'';
    return ct.includes('application/json')? res.json(): res.text();
  }
  window.API={
    session, setSession,
    login: (email,password)=>request('/api/auth/login',{method:'POST',body:{email,password}}),
    register: (name,email,password)=>request('/api/auth/register',{method:'POST',body:{name,email,password}}),
    auth:{
      me:()=>request('/api/auth/me'),
      updateProfile:(payload)=>request('/api/auth/me',{method:'PUT',body:payload})
    },
    listings:{
      list:(params={})=>{
        const qs=new URLSearchParams();
        if(params.q) qs.set('q',params.q);
        if(params.minPrice!==undefined&&params.minPrice!=='') qs.set('minPrice',params.minPrice);
        if(params.maxPrice!==undefined&&params.maxPrice!=='') qs.set('maxPrice',params.maxPrice);
        if(params.beds!==undefined&&params.beds!=='') qs.set('beds',params.beds);
        if(params.baths!==undefined&&params.baths!=='') qs.set('baths',params.baths);
        if(params.city) qs.set('city',params.city);
        if(params.status) qs.set('status', params.status);
        return request('/api/listings'+(qs.toString()?('?'+qs.toString()):''));
      },
      create:(payload)=>request('/api/listings',{method:'POST',body:payload}),
      update:(id,payload)=>request('/api/listings/'+id,{method:'PUT',body:payload}),
      remove:(id)=>request('/api/listings/'+id,{method:'DELETE'})
    },
    chat:{
      public:{
        list:(afterId)=>{
          const qs=afterId? ('?afterId='+encodeURIComponent(afterId)) : '';
          return request('/api/chat/public'+qs);
        },
        send:(content,kind='text')=>request('/api/chat/public',{method:'POST',body:{content,kind}}),
        update:(id,content)=>request('/api/chat/public/'+id,{method:'PUT',body:{content}}),
        remove:(id)=>request('/api/chat/public/'+id,{method:'DELETE'})
      },
      private:{
        threads:()=>request('/api/chat/private/threads'),
        list:(listingId,otherId,afterId)=>{
          const qs=afterId? ('?afterId='+encodeURIComponent(afterId)) : '';
          return request('/api/chat/private/'+listingId+'/'+otherId+qs);
        },
        send:(listingId,otherId,content)=>request('/api/chat/private/'+listingId+'/'+otherId,{method:'POST',body:{content}}),
        update:(id,content)=>request('/api/chat/private/'+id,{method:'PUT',body:{content}}),
        remove:(id)=>request('/api/chat/private/'+id,{method:'DELETE'})
      },
      admins:()=>request('/api/chat/admins')
    }
  };
})();
