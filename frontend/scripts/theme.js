(function(){
  const THEME_KEY = 'RE_theme';
  const root = document.documentElement;

  function getStoredTheme(){
    try{ return localStorage.getItem(THEME_KEY); }catch{ return null; }
  }

  function storeTheme(theme){
    try{ localStorage.setItem(THEME_KEY, theme); }catch{}
  }

  function getPreferredTheme(){
    if(typeof window.matchMedia === 'function'){
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  }

  function currentTheme(){
    return root.getAttribute('data-theme') || 'dark';
  }

  function updateButtons(theme){
    const next = theme === 'dark' ? 'light' : 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach((btn)=>{
      btn.textContent = next === 'light' ? 'Light' : 'Dark';
      btn.setAttribute('aria-label', 'Switch to ' + next + ' theme');
      btn.setAttribute('title', 'Switch to ' + next + ' theme');
    });
  }

  function applyTheme(theme, persist){
    const finalTheme = theme === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', finalTheme);
    updateButtons(finalTheme);
    if(persist){ storeTheme(finalTheme); }
  }

  function initTheme(){
    applyTheme(getStoredTheme() || getPreferredTheme(), false);
  }

  initTheme();

  document.addEventListener('DOMContentLoaded', ()=>{
    updateButtons(currentTheme());
  });

  document.addEventListener('click', (event)=>{
    const btn = event.target.closest('[data-theme-toggle]');
    if(!btn) return;
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
  });
})();
