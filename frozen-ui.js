(() => {
  'use strict';
  let sequence = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observed = new Set();
  let activeFlavor = '';
  const flavorObserver = !reduced && 'IntersectionObserver' in window ? new IntersectionObserver(entries=>{
    const entry=entries.filter(item=>item.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!entry)return;
    const name=entry.target.querySelector('h3')?.textContent || '';
    const color=getComputedStyle(entry.target).getPropertyValue('--flavor').trim();
    if(name+color===activeFlavor)return;
    activeFlavor=name+color;
    const scene=document.querySelector('.flavor-showcase');
    if(!scene)return;
    scene.style.setProperty('--flavor',color);
    scene.querySelector('.showcase-name').textContent=name;
    scene.querySelector('.showcase-cup').replaceChildren(cup(color,'Grande'));
    scene.querySelector('.showcase-cup').animate([{opacity:0,transform:'translateY(18px) scale(.9)'},{opacity:1,transform:'none'}],{duration:500,easing:'cubic-bezier(.23,1,.32,1)'});
    document.getElementById('sabores')?.style.setProperty('--scene-flavor',color);
  },{rootMargin:'-15% 0px -40%',threshold:[0,.25,.65]}) : null;
  const observedCards = new Set();
  const visibility = 'IntersectionObserver' in window ? new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('is-paused',!entry.isIntersecting)),{rootMargin:'50px'}) : null;
  function cup(color = '#5bc0eb', size = 'Mediano') {
    const id = `frozen-${++sequence}`;
    const node = document.createElement('span');
    node.className = 'frozen-cup';
    node.setAttribute('aria-hidden', 'true');
    node.style.setProperty('--flavor', /^#[a-f\d]{6}$/i.test(color) ? color : '#5bc0eb');
    node.dataset.size = size;
    visibility?.observe(node);
    observed.add(node);
    node.innerHTML = `<svg viewBox="0 0 140 190" width="140" height="190"><defs><linearGradient id="${id}"><stop stop-color="white" stop-opacity=".8"/><stop offset=".4" stop-color="white" stop-opacity=".1"/><stop offset="1" stop-color="#07131d" stop-opacity=".35"/></linearGradient><pattern id="${id}-straw" width="8" height="14" patternUnits="userSpaceOnUse"><path fill="white" d="M0 0h8v14H0z"/><path stroke="#ffad4d" stroke-width="5" d="M-4 2l16 8"/></pattern></defs><ellipse cx="70" cy="178" rx="43" ry="8" fill="#07131d" opacity=".18"/><path d="M91 64l13-55" stroke="url(#${id}-straw)" stroke-width="8"/><path d="M29 66l13 94q28 18 56 0l13-94z" class="frozen-body"/><path d="M29 66l13 94q28 18 56 0l13-94z" fill="url(#${id})" stroke="#c6efff" stroke-width="2"/><path d="M26 67q4-48 44-45q38-2 45 45z" class="frozen-dome"/><path d="M31 58l13-17 10 9 17-19 15 17 12-9 12 20" fill="none" stroke="white" stroke-opacity=".6" stroke-width="5"/><ellipse cx="70" cy="68" rx="43" ry="9" fill="none" stroke="#eaffff" stroke-width="3"/><path d="M40 80l9 68" stroke="white" stroke-opacity=".65" stroke-width="5" stroke-linecap="round"/><g fill="white" opacity=".6"><ellipse cx="91" cy="106" rx="3" ry="5"/><ellipse cx="58" cy="124" rx="2" ry="4"/><ellipse cx="86" cy="140" rx="2" ry="3"/></g><path d="M66 30q1-23 24-21q-1 21-24 21" fill="#6fd13a"/><path d="M53 34l4 10 11 1-10 5-2 10-5-10-10-3 11-3z" fill="white" class="frozen-spark"/></svg>`;
    return node;
  }
  window.BarrioCup = cup;
  function decorate() {
    observed.forEach(node=>{if(!node.isConnected){visibility?.unobserve(node);observed.delete(node);}});
    observedCards.forEach(node=>{if(!node.isConnected){flavorObserver?.unobserve(node);observedCards.delete(node);}});
    document.querySelectorAll('.flavor .cup:not([data-frozen])').forEach(old => {
      old.dataset.frozen = '1';
      const color = getComputedStyle(old.closest('.flavor')).getPropertyValue('--flavor').trim();
      old.replaceChildren(cup(color));
      const card=old.closest('.flavor');
      const flavorName=card.querySelector('[data-flavor]')?.dataset.flavor;
      const item=typeof flavor==='function' ? flavor(flavorName) : null;
      const photo=item?.image || item?.imagen;
      if(typeof photo==='string' && (/^https:\/\//i.test(photo) || /^\/(?!\/)/.test(photo))){
        const img=new Image();img.width=140;img.height=190;img.alt='';img.loading='lazy';img.decoding='async';img.className='frozen-photo';
        img.onload=()=>old.replaceChildren(img);img.src=photo;
      }
      flavorObserver?.observe(card);observedCards.add(card);
    });
    document.querySelectorAll('.cart-line:not([data-frozen])').forEach(line => {
      line.dataset.frozen = '1';
      if (!/granizado/i.test(line.textContent)) return;
      const text = line.textContent;
      const flavor = [...document.querySelectorAll('.flavor')].find(card => text.includes(card.querySelector('h3')?.textContent));
      const color = flavor ? getComputedStyle(flavor).getPropertyValue('--flavor').trim() : '#5bc0eb';
      line.prepend(cup(color, /Pequeño/.test(text) ? 'Pequeño' : /Grande/.test(text) ? 'Grande' : 'Mediano'));
    });
  }
  document.addEventListener('barrio:render', decorate);
  document.addEventListener('barrio:draw', decorate);
  decorate();
  const panel = document.getElementById('adminView');
  if (panel) new MutationObserver(() => {
    panel.querySelectorAll('.metric b:not([data-counted])').forEach(number => {
      number.dataset.counted = '1';
      if (reduced) return;
      const original = number.textContent, target = Number(original.replace(/[^0-9]/g, ''));
      if (!Number.isFinite(target)) return;
      const start = performance.now();
      function tick(time) { const p = Math.min(1, (time-start)/450); number.textContent = p === 1 ? original : (original.includes('$')?'$':'') + Math.round(target*(1-(1-p)**3)).toLocaleString('es-CO'); if(p<1 && number.isConnected)requestAnimationFrame(tick); }
      requestAnimationFrame(tick);
    });
  }).observe(panel, {childList:true,subtree:true});
})();
