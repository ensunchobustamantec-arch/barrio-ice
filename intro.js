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
  const finish = () => { if(final)return; final=true;host.getAnimations({subtree:true}).forEach(animation=>animation.cancel());host.classList.add('entry-ready');host.querySelector('.entry-skip').hidden=true;host.querySelector('.entry-links').inert=false; };
  host.className = 'barrio-entry';
  host.removeAttribute('aria-describedby');
  host.setAttribute('aria-label','Bienvenido a Barrio Ice');
  host.querySelector('.entry-links').inert=true;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  host.style.setProperty('--duration', `${LANDING_DURATION_MS}ms`);
  const logo=host.querySelector('.entry-logo');
  logo.querySelectorAll('img').forEach(img=>{img.srcset='/assets/brand/logo-dark-mobile.webp 320w, /assets/brand/logo-dark.webp 625w';img.sizes='(max-width: 420px) 70vw, 310px';});
  const glint=document.createElement('i');glint.className='entry-glint';logo.append(glint);
  const frost=document.createElement('i');frost.className='entry-impact';host.querySelector('.entry-stage').append(frost);
  const drink=document.createElement('div');
  drink.className='entry-drink';
  if(window.BarrioCup)drink.append(window.BarrioCup('#9b3fd6','Pequeño'));
  host.insertBefore(drink,host.querySelector('.entry-tag'));
  if(!reduced)drink.animate([{opacity:0,transform:'translateY(20px)'},{opacity:1,transform:'translateY(0)'}],{delay:LANDING_DURATION_MS*.77,duration:LANDING_DURATION_MS*.13,fill:'forwards'});
  if(!reduced){
    frost.animate([{opacity:0,transform:'scale(.15)'},{opacity:.9,offset:.2,transform:'scale(.5)'},{opacity:0,transform:'scale(1.6)'}],{delay:LANDING_DURATION_MS/3,duration:LANDING_DURATION_MS*.18,fill:'both'});
    glint.animate([{opacity:0,transform:'translateX(-220%) rotate(25deg)'},{opacity:.8,offset:.4},{opacity:0,transform:'translateX(400%) rotate(25deg)'}],{delay:LANDING_DURATION_MS*.57,duration:LANDING_DURATION_MS*.2,fill:'both'});
    drink.querySelector('.frozen-body')?.animate([{transform:'scaleY(.05)'},{transform:'scaleY(1)'}],{delay:LANDING_DURATION_MS*.77,duration:LANDING_DURATION_MS*.13,fill:'backwards',easing:'cubic-bezier(.23,1,.32,1)'});
    host.querySelectorAll('.entry-links a').forEach((link,i)=>link.animate([{opacity:0,transform:'translateY(24px) scale(.94)'},{opacity:1,transform:'none'}],{delay:LANDING_DURATION_MS*.9+i*LANDING_DURATION_MS*.02,duration:LANDING_DURATION_MS*.08,fill:'backwards'}));
    host.querySelectorAll('.entry-fragments i').forEach((piece,i)=>piece.animate([{transform:`rotate(${i*45}deg) translateX(55vw) rotateY(120deg)`,opacity:0},{transform:`rotate(${i*45}deg) translateX(30px) rotateY(0deg)`,opacity:.9},{transform:`rotate(${i*45}deg) translateX(0px)`,opacity:0}],{delay:LANDING_DURATION_MS*.1+i*40,duration:LANDING_DURATION_MS*.46,fill:'both',easing:'cubic-bezier(.23,1,.32,1)'}));
    logo.animate([{opacity:0,transform:'perspective(900px) rotateY(-25deg) scale(.9)'},{opacity:1,transform:'perspective(900px) rotateY(0deg) scale(1)'}],{delay:LANDING_DURATION_MS/3,duration:LANDING_DURATION_MS*.43,fill:'backwards',easing:'cubic-bezier(.23,1,.32,1)'});
    host.addEventListener('pointermove',e=>{if(!final||e.pointerType==='touch')return;const box=logo.getBoundingClientRect();logo.style.transform=`perspective(900px) rotateY(${Math.max(-10,Math.min(10,(e.clientX-box.left-box.width/2)/30))}deg)`;});
    host.addEventListener('pointerleave',()=>logo.style.transform='');
  }
  host.querySelector('.entry-skip').onclick=finish;
  setTimeout(()=>{if(host.isConnected)host.classList.add('entry-choices');},reduced?0:LANDING_DURATION_MS*.9);
  const onKey=e=>{if(e.key==='Escape')finish();};document.addEventListener('keydown',onKey);
  host.querySelectorAll('a').forEach(a=>a.addEventListener('click',e=>{try{sessionStorage.setItem('barrio-entry-v5','1');}catch{}document.removeEventListener('keydown',onKey);document.body.style.overflow=previousOverflow;if(a.pathname===location.pathname){e.preventDefault();host.remove();document.querySelector('main a, main button, header a')?.focus({preventScroll:true});}}));
  setTimeout(finish,reduced?700:LANDING_DURATION_MS);
})();
