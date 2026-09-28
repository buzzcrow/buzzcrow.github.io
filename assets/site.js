/* Progressive enhancement only: content and navigation remain ordinary HTML. */
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.remove('no-js'); root.classList.add('js');
  const $ = (selector, context=document) => context.querySelector(selector);
  const $$ = (selector, context=document) => [...context.querySelectorAll(selector)];
  const menu = $('[data-menu]'), nav = $('#primary-nav');
  const closeMenu = () => { if(menu && nav) { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); } };
  if(menu && nav){
    menu.addEventListener('click', () => {const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open);});
    nav.addEventListener('click', e => {if(e.target.closest('a')) closeMenu();});
    document.addEventListener('keydown', e => {if(e.key==='Escape' && menu.getAttribute('aria-expanded')==='true'){ closeMenu(); menu.focus(); }});
    document.addEventListener('click',e=>{if(!e.target.closest('.site-header')) closeMenu();});
  }
  async function copy(text, button) {
    const original = button.textContent;
    try {
      if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const field=document.createElement('textarea'); field.value=text;
        field.setAttribute('readonly',''); field.style.cssText='position:fixed;left:-9999px;top:0';
        document.body.append(field); field.select();
        const success=document.execCommand('copy'); field.remove(); button.focus();
        if(!success) throw new Error('Clipboard unavailable');
      }
      button.textContent='Copied';
    } catch { button.textContent='Select code to copy'; }
    setTimeout(()=>{button.textContent=original;},2000);
  }
  $$('.code-block, .highlighter-rouge').forEach(block=>{
    const code=$('pre code',block)||$('pre',block); if(!code || $('.copy-button',block)) return;
    const button=document.createElement('button'); button.type='button'; button.className='copy-button'; button.textContent='Copy'; button.setAttribute('aria-label','Copy code'); button.setAttribute('aria-live','polite');
    button.addEventListener('click',()=>copy(code.textContent.trimEnd(),button)); block.append(button);
  });
  const article=$('[data-article]');
  if(article){
    const headings=$$('h2',article);
    const used=new Set();
    headings.forEach((heading,index)=>{
      if(!heading.id){let id=heading.textContent.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-')||`section-${index+1}`;while(used.has(id))id+='-2';heading.id=id;}
      used.add(heading.id);
    });
    $$('[data-toc]').forEach(toc=>{
      toc.replaceChildren();
      headings.forEach(h=>{const a=document.createElement('a');a.href='#'+h.id;a.textContent=h.textContent;toc.append(a);});
    });
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{if(entry.isIntersecting)$$('[data-toc] a').forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));});
      },{rootMargin:'-100px 0px -64% 0px'});
      headings.forEach(h=>observer.observe(h));
    }
    const progress=$('[data-progress]');
    let ticking=false;
    const update=()=>{
      const start=article.getBoundingClientRect().top+window.scrollY-100;
      const distance=Math.max(1,article.offsetHeight-window.innerHeight+130);
      const amount=Math.max(0,Math.min(1,(window.scrollY-start)/distance));
      if(progress) progress.style.transform=`scaleX(${amount})`; ticking=false;
    };
    window.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(update);ticking=true;}},{passive:true});window.addEventListener('resize',update);update();
  }
  function setFont(size){
    if(!['16','18','20'].includes(String(size))) size='18';
    root.style.setProperty('--body-size',size+'px');
    $$('[data-font-size]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fontSize===String(size))));
  }
  try{setFont(localStorage.getItem('crowdb-reading-size')||'18');}catch{setFont('18');}
  $$('[data-font-size]').forEach(button=>button.addEventListener('click',()=>{
    setFont(button.dataset.fontSize);try{localStorage.setItem('crowdb-reading-size',button.dataset.fontSize);}catch{}
  }));
  const filters=$$('[data-category]'), posts=$$('[data-post]'), search=$('[data-search]');
  if(posts.length){
    let category='All';
    const filter=()=>{
      const query=(search?.value||'').toLowerCase().trim();let count=0;
      posts.forEach(post=>{const match=(category==='All'||post.dataset.postCategory===category)&&post.textContent.toLowerCase().includes(query);post.hidden=!match;if(match)count++;});
      const empty=$('[data-empty]');if(empty)empty.hidden=count!==0;
      const status=$('[data-result-count]');if(status)status.textContent=`${count} ${count===1?'article':'articles'} shown`;
    };
    filters.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.category;filters.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filter();}));
    search?.addEventListener('input',filter);
    const reset=$('[data-reset-search]');reset?.addEventListener('click',()=>{category='All';if(search)search.value='';filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category==='All')));filter();search?.focus();});
    filter();
  }
})();
