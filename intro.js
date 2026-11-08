(() => {
  'use strict';
  const LANDING_DURATION_MS = 6000;
  const host = document.getElementById('barrioIntro');
  if (!host) return;
  const query = new URLSearchParams(location.search);
  let seen = false;
  try { seen = sessionStorage.getItem('barrio-entry-v5') === '1'; } catch {}
  if (query.get('intro') === '0' || (seen && query.get('intro') !== '1')) { host.remove(); return; }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  host.innerHTML = `<div class="entry-snow" aria-hidden="true">${Array.from({length:24},(_,i)=>`<i style="left:${i*4.2}%;animation-delay:-${i*.37}s"></i>`).join('')}</div><div class="entry-stage"><div class="entry-fragments" aria-hidden="true">${Array.from({length:8},(_,i)=>`<i style="--angle:${i*45}deg"></i>`).join('')}</div><div class="entry-logo">${Array.from({length:4},(_,i)=>`<img src="/assets/brand/logo-dark.webp" width="625" height="970" alt="${i===3?'Barrio Ice':''}" style="--depth:${i*5}px" />`).join('')}</div></div><p class="entry-tag">COLD FLOW · MONTERÍA</p><nav class="entry-links" aria-label="Elige tu acceso"><a href="/" data-entry-client>❄ Soy cliente</a><a href="/admin/">▦ Administrador</a></nav><button type="button" class="entry-skip">Saltar</button>`;
  let final = false;
  const finish = () => { if(final)return; final=true;host.classList.add('entry-ready');host.querySelector('.entry-skip').hidden=true; };
  host.className = 'barrio-entry';
  host.style.setProperty('--duration', `${LANDING_DURATION_MS}ms`);
  const logo=host.querySelector('.entry-logo');
  if(!reduced){
    host.querySelectorAll('.entry-fragments i').forEach((piece,i)=>piece.animate([{transform:`rotate(${i*45}deg) translateX(55vw) rotateY(120deg)`,opacity:0},{transform:`rotate(${i*45}deg) translateX(30px) rotateY(0deg)`,opacity:.9},{transform:`rotate(${i*45}deg) translateX(0px)`,opacity:0}],{delay:LANDING_DURATION_MS*.1+i*40,duration:LANDING_DURATION_MS*.46,fill:'both',easing:'cubic-bezier(.23,1,.32,1)'}));
    logo.animate([{opacity:0,transform:'perspective(900px) rotateY(-25deg) scale(.9)'},{opacity:1,transform:'perspective(900px) rotateY(0deg) scale(1)'}],{delay:LANDING_DURATION_MS/3,duration:LANDING_DURATION_MS*.43,fill:'backwards',easing:'cubic-bezier(.23,1,.32,1)'});
    host.addEventListener('pointermove',e=>{if(!final||e.pointerType==='touch')return;const box=logo.getBoundingClientRect();logo.style.transform=`perspective(900px) rotateY(${Math.max(-10,Math.min(10,(e.clientX-box.left-box.width/2)/30))}deg)`;});
    host.addEventListener('pointerleave',()=>logo.style.transform='');
  }
  host.querySelector('.entry-skip').onclick=finish;
  const onKey=e=>{if(e.key==='Escape')finish();};document.addEventListener('keydown',onKey);
  host.querySelectorAll('a').forEach(a=>a.addEventListener('click',e=>{try{sessionStorage.setItem('barrio-entry-v5','1');}catch{}document.removeEventListener('keydown',onKey);if(a.pathname===location.pathname){e.preventDefault();host.remove();}}));
  setTimeout(finish,reduced?700:LANDING_DURATION_MS);
})();
