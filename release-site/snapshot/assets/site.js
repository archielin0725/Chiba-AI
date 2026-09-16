document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.filter.toLowerCase();document.querySelectorAll('.products .card').forEach(card=>{const text=card.textContent.toLowerCase();card.style.display=value==='all'||text.includes(value)?'block':'none'})}))

document.querySelectorAll('[data-catalogue-controls]').forEach(controls=>{
  const cards=[...document.querySelectorAll('.products .card')];
  const search=controls.querySelector('input');
  const line=controls.querySelector('select');
  const clearBtn=controls.querySelector('[data-search-clear]');
  const resetLink=controls.querySelector('[data-search-reset]');
  const chips=[...controls.querySelectorAll('[data-chip]')];
  const statusEl=controls.querySelector('[role="status"]');
  const isEn=document.documentElement.lang.startsWith('en');

  let activeChipValue='';

  const filter=()=>{
    const q=search ? search.value.trim().toLocaleLowerCase() : '';
    const selLine=line ? line.value : '';
    let count=0;

    cards.forEach(card=>{
      const text=card.textContent.toLocaleLowerCase();
      const cardLine=card.dataset.line||'';
      const cardSku=card.dataset.sku||'';
      
      let matchesQuery=!q || text.includes(q) || cardSku.includes(q);
      let matchesLine=!selLine || cardLine===selLine;
      let matchesChip=!activeChipValue || text.includes(activeChipValue.toLocaleLowerCase()) || cardLine.toLocaleLowerCase().includes(activeChipValue.toLocaleLowerCase());

      const visible=matchesQuery && matchesLine && matchesChip;
      card.hidden=!visible;
      if(visible) count++;
    });

    if(statusEl){
      if(count>0){
        statusEl.textContent=isEn?`Showing ${count} product${count>1?'s':''}`:`顯示 ${count} 件產品`;
      } else {
        statusEl.textContent=isEn?'No matching products found. Please try a different search.':'找不到符合條件的產品，請調整關鍵字或重設篩選。';
      }
    }

    if(clearBtn){
      clearBtn.style.display=search && search.value?'flex':'none';
    }
    if(resetLink){
      const hasFilter=(search && search.value) || (line && line.value) || activeChipValue;
      resetLink.style.display=hasFilter?'inline':'none';
    }
  };

  if(search){
    search.addEventListener('input',filter);
  }
  if(line){
    line.addEventListener('change',filter);
  }
  if(clearBtn && search){
    clearBtn.addEventListener('click',()=>{
      search.value='';
      search.focus();
      filter();
    });
  }
  if(resetLink){
    resetLink.addEventListener('click',()=>{
      if(search) search.value='';
      if(line) line.value='';
      activeChipValue='';
      chips.forEach(c=>c.classList.remove('active'));
      filter();
    });
  }

  chips.forEach(chip=>{
    chip.addEventListener('click',()=>{
      const val=chip.dataset.chip||'';
      if(activeChipValue===val){
        activeChipValue='';
        chip.classList.remove('active');
      } else {
        chips.forEach(c=>c.classList.remove('active'));
        activeChipValue=val;
        chip.classList.add('active');
      }
      filter();
    });
  });

  filter();
});

document.querySelectorAll('[data-size-checker]').forEach(form=>{
  const input=form.querySelector('input'); const result=form.querySelector('[data-size-result]');
  const isEn=document.documentElement.lang.startsWith('en');
  const check=()=>{
    const raw=input.value.trim();
    if(!raw){
      result.textContent=''; result.removeAttribute('data-state'); input.removeAttribute('aria-invalid'); return;
    }
    const value=Number(raw);
    if(!Number.isFinite(value)||value<10||value>35){
      result.textContent=isEn?'Please enter a hand circumference between 10 and 35 cm.':'請輸入 10–35 公分之間的掌圍。';
      result.dataset.state='error'; input.setAttribute('aria-invalid','true'); return;
    }
    const adultSizes=[{size:'XS',circumference:17},{size:'S',circumference:19},{size:'M',circumference:22},{size:'L',circumference:24},{size:'XL',circumference:25},{size:'XXL',circumference:26},{size:'3XL',circumference:27}];
    const recommendation=adultSizes.reduce((closest,current)=>Math.abs(current.circumference-value)<=Math.abs(closest.circumference-value)?current:closest);
    result.textContent=isEn?`Recommended Size: ${recommendation.size} (hand circumference ~${recommendation.circumference} cm). Please verify availability on the specific product page; when between sizes, selecting the larger size is recommended.`:`參考尺寸：${recommendation.size}（掌圍 ${recommendation.circumference} 公分）。請到產品頁確認該款式是否提供此尺寸；介於尺寸之間通常建議選擇較大尺寸。`;
    result.dataset.state='success'; input.removeAttribute('aria-invalid');
  };
  form.addEventListener('submit',event=>{event.preventDefault();check()});
  input.addEventListener('input',check);
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
  const isEn=document.documentElement.lang.startsWith('en');
  const select=key=>{
    const variant=variants.find(item=>item.key===key); if(!variant) return;
    product.querySelectorAll('[data-variant-key]').forEach(button=>{const active=button.dataset.variantKey===key;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});
    const galleryImages=[...new Set([...(variant.sharedImages||[]),...variant.images])];
    const model=product.querySelector('h1').textContent;
    gallery.innerHTML=galleryImages.length?galleryImages.map((src,index)=>`<img src="${esc(src)}" alt="${esc(model)} ${esc(variant.colour)}" loading="${index===0?'eager':'lazy'}" decoding="async">`).join(''):'<div class="no-image">'+(isEn?'Image pending':'圖片待確認')+'</div>';
    colour.textContent=variant.colour; sizes.textContent=variant.sizes;
    price.textContent=isEn?`Suggested Retail Price ${variant.price}`:`建議零售價 ${variant.price}`;
    description.textContent=variant.description||(isEn?'Product information verified by CHIBA Taiwan.':'產品資訊依 CHIBA Taiwan 已核對資料建立。');
  };
  product.querySelectorAll('[data-variant-key]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.variantKey)));
});

const menu=document.querySelector('.menu');
if(menu){
  menu.removeAttribute('onclick');
  menu.setAttribute('aria-expanded','false');
  const isEn=document.documentElement.lang.startsWith('en');
  const openLabel=isEn?'Open menu':'開啟選單';
  const closeLabel=isEn?'Close menu':'關閉選單';
  menu.addEventListener('click',()=>{const open=document.body.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?closeLabel:openLabel)});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.body.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label',openLabel)}});
}

// Size guide tab switching (ARIA tablist pattern with keyboard support)
document.querySelectorAll('.size-tabs[role="tablist"]').forEach(function(tablist){
  var tabs=[].slice.call(tablist.querySelectorAll('[role="tab"]'));
  function activate(tab){
    tabs.forEach(function(t){t.setAttribute('aria-selected','false');t.classList.remove('size-tab--active');var p=document.getElementById(t.getAttribute('aria-controls'));if(p)p.hidden=true;});
    tab.setAttribute('aria-selected','true');tab.classList.add('size-tab--active');var panel=document.getElementById(tab.getAttribute('aria-controls'));if(panel)panel.hidden=false;tab.focus();
  }
  tabs.forEach(function(tab,idx){
    tab.addEventListener('click',function(){activate(tab);});
    tab.addEventListener('keydown',function(e){
      if(e.key==='ArrowRight'){e.preventDefault();activate(tabs[(idx+1)%tabs.length]);}
      if(e.key==='ArrowLeft'){e.preventDefault();activate(tabs[(idx-1+tabs.length)%tabs.length]);}
      if(e.key==='Home'){e.preventDefault();activate(tabs[0]);}
      if(e.key==='End'){e.preventDefault();activate(tabs[tabs.length-1]);}
    });
  });
});

// Dynamic Hero Showcase Slider Controller (chiba.co.id style)
function initHeroSlider() {
  const slider = document.querySelector('.hero-slider');
  if (!slider) return;

  const slides = [...slider.querySelectorAll('.hero-slide')];
  if (slides.length <= 1) return;

  const prevBtn = slider.querySelector('.hero-slider-arrow--prev');
  const nextBtn = slider.querySelector('.hero-slider-arrow--next');
  const dotsContainer = slider.querySelector('.hero-slider-dots');
  let currentIndex = 0;
  let timer = null;
  const intervalTime = 4000;

  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    slides.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.className = `hero-slider-dot ${idx === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Slide ${idx + 1}`);
      dot.setAttribute('type', 'button');
      dot.addEventListener('click', () => {
        goToSlide(idx);
        restartTimer();
      });
      dotsContainer.appendChild(dot);
    });
  }

  const dots = dotsContainer ? [...dotsContainer.querySelectorAll('.hero-slider-dot')] : [];

  function goToSlide(idx) {
    slides[currentIndex].classList.remove('active');
    if (dots[currentIndex]) dots[currentIndex].classList.remove('active');

    currentIndex = (idx + slides.length) % slides.length;

    slides[currentIndex].classList.add('active');
    if (dots[currentIndex]) dots[currentIndex].classList.add('active');
  }

  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  function prevSlide() {
    goToSlide(currentIndex - 1);
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(nextSlide, intervalTime);
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function restartTimer() {
    stopTimer();
    startTimer();
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
      restartTimer();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextSlide();
      restartTimer();
    });
  }


  let touchStartX = 0;
  let touchEndX = 0;
  slider.addEventListener('touchstart', (e) => {
    stopTimer();
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  slider.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    startTimer();
  }, { passive: true });

  startTimer();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeroSlider);
} else {
  initHeroSlider();
}

