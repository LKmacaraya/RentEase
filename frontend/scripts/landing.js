(function(){
  function formatCurrency(value){
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  }

  function initPersonaTabs(){
    const tabs = Array.from(document.querySelectorAll('[data-persona-tab]'));
    const panels = Array.from(document.querySelectorAll('[data-persona-panel]'));
    if(!tabs.length || !panels.length) return;

    tabs.forEach((tab)=>{
      tab.addEventListener('click', ()=>{
        const key = tab.getAttribute('data-persona-tab');
        // Keep the tab button state and the matching content panel in sync from the same key.
        tabs.forEach((item)=>{
          const active = item === tab;
          item.classList.toggle('active', active);
          item.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        panels.forEach((panel)=>{
          panel.classList.toggle('active', panel.getAttribute('data-persona-panel') === key);
        });
      });
    });
  }

  function initBudgetCalculator(){
    const inputs = Array.from(document.querySelectorAll('[data-calc-input]'));
    const totalEl = document.querySelector('[data-calc-total]');
    if(!inputs.length || !totalEl) return;

    const reads = {};
    document.querySelectorAll('[data-calc-read]').forEach((el)=>{
      reads[el.getAttribute('data-calc-read')] = el;
    });

    const refresh = ()=>{
      let total = 0;
      inputs.forEach((input)=>{
        const key = input.getAttribute('data-calc-input');
        const value = Number(input.value || 0);
        total += value;
        const readEl = reads[key];
        if(readEl) readEl.textContent = formatCurrency(value);
      });
      // The UI shows both per-field values and the combined monthly estimate from the same pass.
      totalEl.textContent = formatCurrency(total);
    };

    inputs.forEach((input)=> input.addEventListener('input', refresh));
    refresh();
  }

  function initCounters(){
    const counters = Array.from(document.querySelectorAll('[data-counter]'));
    if(!counters.length) return;

    const animate = (counter)=>{
      const target = Number(counter.getAttribute('data-counter') || 0);
      const suffix = counter.getAttribute('data-counter-suffix') || '';
      const duration = 900;
      const start = performance.now();
      const step = (time)=>{
        const progress = Math.min((time - start) / duration, 1);
        const current = Math.round(progress * target);
        const base = target >= 100 ? current.toLocaleString('en-US') : String(current);
        counter.textContent = base + suffix;
        if(progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    // Counters animate once on first view so they do not restart every time the user scrolls.
    const observer = new IntersectionObserver((entries, obs)=>{
      entries.forEach((entry)=>{
        if(!entry.isIntersecting) return;
        animate(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    counters.forEach((counter)=> observer.observe(counter));
  }

  function initTimelineReveal(){
    const steps = Array.from(document.querySelectorAll('[data-step]'));
    if(!steps.length) return;
    // Reuse intersection observers for scroll-in motion instead of binding manual scroll handlers.
    const observer = new IntersectionObserver((entries)=>{
      entries.forEach((entry)=>{
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.3 });
    steps.forEach((step)=> observer.observe(step));
  }

  function initFaq(){
    const items = Array.from(document.querySelectorAll('.faq-item'));
    if(!items.length) return;
    items.forEach((item)=>{
      item.addEventListener('toggle', ()=>{
        // Behave like an accordion: opening one answer closes the others.
        if(!item.open) return;
        items.forEach((other)=>{
          if(other !== item) other.open = false;
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // Initialize only the modules that have matching markup on the current landing page variant.
    initPersonaTabs();
    initBudgetCalculator();
    initCounters();
    initTimelineReveal();
    initFaq();
  });
})();
