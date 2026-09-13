document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.filter.toLowerCase();document.querySelectorAll('.products .card').forEach(card=>{const text=card.textContent.toLowerCase();card.style.display=value==='all'||text.includes(value)?'block':'none'})}))

document.querySelectorAll('[data-catalogue-controls]').forEach(controls=>{
  const cards=[...document.querySelectorAll('.products .card')];
  const search=controls.querySelector('input'); const line=controls.querySelector('select');
  const filter=()=>{let count=0;cards.forEach(card=>{const matches=card.textContent.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())&&(!line.value||card.dataset.line===line.value);card.hidden=!matches;if(matches)count++});controls.querySelector('[role="status"]').textContent=count?`${count} 項產品`:'找不到符合條件的產品，請調整搜尋條件。'};
  search.addEventListener('input',filter);line.addEventListener('change',filter);filter();
});

document.querySelectorAll('[data-variant-product]').forEach(product=>{
  const payload=product.parentElement.querySelector('[data-variant-data]');
  if(!payload) return;
  let variants=[]; try{variants=JSON.parse(payload.textContent)}catch(_){return}
  const esc=value=>String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const gallery=product.querySelector('[data-gallery]');
  const colour=product.querySelector('[data-variant-colour]');
  const sizes=product.querySelector('[data-variant-sizes]');
  const price=product.querySelector('[data-variant-price]');
  const description=product.querySelector('[data-variant-description]');
  const select=key=>{
    const variant=variants.find(item=>item.key===key); if(!variant) return;
    product.querySelectorAll('[data-variant-key]').forEach(button=>{const active=button.dataset.variantKey===key;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});
    const galleryImages=[...new Set([...(variant.sharedImages||[]),...variant.images])];
    const model=product.querySelector('h1').textContent;
    gallery.innerHTML=galleryImages.length?galleryImages.map((src,index)=>`<img src="${esc(src)}" alt="${esc(model)} ${esc(variant.colour)}" loading="${index===0?'eager':'lazy'}" decoding="async">`).join(''):'<div class="no-image">圖片待確認</div>';
    colour.textContent=variant.colour; sizes.textContent=variant.sizes; price.textContent=`台灣零售價 ${String(variant.price).replace(/NT\$\s*/, 'NT$')}（含稅）`;
    description.textContent=variant.description||'產品資訊依 CHIBA Taiwan 已核對資料建立。';
  };
  product.querySelectorAll('[data-variant-key]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.variantKey)));
});

const menu=document.querySelector('.menu');
if(menu){
  menu.removeAttribute('onclick');
  menu.setAttribute('aria-expanded','false');
  menu.addEventListener('click',()=>{const open=document.body.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'關閉選單':'開啟選單')});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.body.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','開啟選單')}});
}
