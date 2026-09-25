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
  const colourLabel=value=>{
    if(document.documentElement.lang.startsWith('en')) return value;
    const labels={
      beige:'米色', black:'黑色', blue:'藍色', brown:'棕色',
      burgundy:'酒紅色', cream:'奶油色', dkgrey:'深灰色',
      gold:'金色', gray:'灰色', grey:'灰色', green:'綠色',
      khaki:'卡其色', ltblue:'淺藍色', navy:'深藍色',
      neonorange:'螢光橘', neongreen:'螢光綠', neonyellow:'螢光黃',
      olive:'橄欖綠', orange:'橘色', petrol:'石油藍',
      pink:'粉紅色', purple:'紫色', red:'紅色', rosa:'粉紅色',
      royalblue:'皇家藍', silver:'銀色', turquoise:'土耳其藍',
      tourquise:'土耳其藍', uni:'單色', violett:'紫色',
      white:'白色', yellow:'黃色'
    };
    return String(value).trim().split('/').map(part=>{
      const normalized=part.trim().toLowerCase().replace(/[.\s]+/g,'');
      const translated=labels[normalized];
      if(translated) return translated;
      return part.trim().replace(/\b(black|beige|blue|brown|gray|grey|green|navy|orange|petrol|pink|purple|red|uni|white|yellow)\b/gi, token=>labels[token.toLowerCase()]||token);
    }).join('／');
  };
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
    const displayColour=colourLabel(variant.colour);
    gallery.innerHTML=galleryImages.length?galleryImages.map((src,index)=>`<img src="${esc(src)}" alt="${esc(model)} ${esc(displayColour)}" loading="${index===0?'eager':'lazy'}" decoding="async">`).join(''):'<div class="no-image">'+(isEn?'Image pending':'圖片待確認')+'</div>';
    colour.textContent=displayColour; sizes.textContent=variant.sizes;
    product.querySelectorAll('[data-variant-key]').forEach(button=>{
      const selected=variants.find(item=>item.key===button.dataset.variantKey);
      if(selected) button.textContent=colourLabel(selected.colour);
    });
    const isFitness = product.classList.contains('fitness-product') || window.location.pathname.indexOf('/fitness/') !== -1;
    price.textContent=isEn?`Suggested Retail Price ${variant.price}`:(isFitness?`台灣零售價 ${variant.price}`:`建議零售價 ${variant.price}`);
    description.textContent=variant.description||(isEn?'Product information verified by CHIBA Taiwan.':'產品資訊依 CHIBA Taiwan 已核對資料建立。');
  };
  product.querySelectorAll('[data-variant-key]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.variantKey)));
  const activeButton=product.querySelector('[data-variant-key].active');
  if(activeButton) select(activeButton.dataset.variantKey);
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

// ==========================================================================
// Pluggable E-Commerce Module Loader (Option B Decoupled Architecture)
// Master Kill-Switch: URL query (?shop=0/1) -> localStorage -> chiba-config.json
// ==========================================================================
(function() {
  window.CHIBA_CONFIG = window.CHIBA_CONFIG || {};

  // 1. Resolve URL Query Overrides (?shop=0/1, ?shop=off/on, ?ecommerce=0/1)
  try {
    var searchParams = new URLSearchParams(window.location.search);
    var shopParam = searchParams.get('shop') || searchParams.get('ecommerce');
    if (shopParam !== null) {
      shopParam = shopParam.toLowerCase().trim();
      if (shopParam === '0' || shopParam === 'off' || shopParam === 'false' || shopParam === 'disable') {
        sessionStorage.setItem('chiba_shop_disable', 'true');
      } else if (shopParam === '1' || shopParam === 'on' || shopParam === 'true' || shopParam === 'enable') {
        sessionStorage.removeItem('chiba_shop_disable');
      }
    }
  } catch (e) {}

  // 2. Production Default: E-Commerce is ALWAYS ACTIVE
  // Purge any stale legacy 'false' flags from early test sessions
  try {
    if (localStorage.getItem('chiba_ecommerce_active') === 'false') {
      localStorage.removeItem('chiba_ecommerce_active');
    }
  } catch (e) {}

  var isEnabled = true;
  try {
    if (sessionStorage.getItem('chiba_shop_disable') === 'true') {
      isEnabled = false;
    }
  } catch (e) {}

  window.CHIBA_CONFIG.enableEcommerce = isEnabled;

  // Expose convenient global helper for console & admin scripts
  window.CHIBA_SWITCH = {
    isEnabled: function() { return !!window.CHIBA_CONFIG.enableEcommerce; },
    set: function(active) {
      if (active) {
        sessionStorage.removeItem('chiba_shop_disable');
      } else {
        sessionStorage.setItem('chiba_shop_disable', 'true');
      }
      window.CHIBA_CONFIG.enableEcommerce = !!active;
      window.location.reload();
    },
    toggle: function() {
      var next = !window.CHIBA_SWITCH.isEnabled();
      window.CHIBA_SWITCH.set(next);
    }
  };

  // 3. If E-Commerce is Disabled:
  // ZERO impact mode — DO NOT inject chiba-ecommerce.css or chiba-ecommerce.js!
  // All 220 product routes and static pages remain 100% pure static catalog.
  if (!isEnabled) {
    // Graceful fallback if user explicitly visits /checkout/
    if (window.location.pathname.indexOf('/checkout') !== -1) {
      document.addEventListener('DOMContentLoaded', function() {
        var isEn = document.documentElement.lang && document.documentElement.lang.indexOf('en') === 0;
        var main = document.querySelector('main') || document.body;
        main.innerHTML = '<div style="max-width: 640px; margin: 80px auto; padding: 48px 32px; background: #ffffff; border-radius: 16px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.06); font-family: -apple-system, BlinkMacSystemFont, sans-serif;">' +
          '<div style="font-size: 3.5rem; margin-bottom: 20px;">📦</div>' +
          '<h1 style="font-size: 1.6rem; font-weight: 800; color: #0f172a; margin-bottom: 14px;">' + (isEn ? 'Online Shopping Currently Suspended' : '線上購物功能目前暫停開放') + '</h1>' +
          '<p style="font-size: 1rem; color: #64748b; line-height: 1.65; margin-bottom: 28px;">' + (isEn ? 'The website is currently operating in catalog-only mode. For orders, authorized dealerships, or inquiries, please contact our team.' : '目前官方網站以純型錄展示模式運作。如需訂購德國百年機能手套、洽詢實體經銷門市或大宗採購，歡迎與我們聯繫。') + '</p>' +
          '<div style="display: flex; justify-content: center; gap: 14px; flex-wrap: wrap;">' +
            '<a href="' + (isEn ? '/en/products/' : '/zh-tw/products/') + '" style="display: inline-block; padding: 12px 28px; background: #b92027; color: #fff; font-weight: 700; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(185,32,39,0.25);">' + (isEn ? 'Browse Product Catalog' : '瀏覽產品型錄') + '</a>' +
            '<a href="' + (isEn ? '/en/contact/' : '/zh-tw/contact/') + '" style="display: inline-block; padding: 12px 24px; background: #f1f5f9; color: #334155; font-weight: 600; border-radius: 8px; text-decoration: none;">' + (isEn ? 'Contact Us' : '聯絡我們') + '</a>' +
          '</div>' +
        '</div>';
      });
    }
    return;
  }

  // 4. If E-Commerce is Enabled: Dynamically inject decoupled assets (versioned to avoid stale cache)
  if (!document.querySelector('link[href*="chiba-ecommerce.css"]')) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/chiba-ecommerce.css?v=20260926d';
    document.head.appendChild(link);
  }

  if (!document.querySelector('script[src*="chiba-ecommerce.js"]')) {
    var script = document.createElement('script');
    script.src = '/assets/chiba-ecommerce.js?v=20260926d';
    script.defer = true;
    document.body.appendChild(script);
  }
})();

// ==========================================================================
// Central Parameter Management Engine (No-Code Price & Wording Overrides)
// ==========================================================================
(function() {
  function getParams() {
    var params = { priceOverrides: {}, wordingOverrides: { 'zh-tw': {}, 'en': {} } };
    try {
      var local = localStorage.getItem('chiba_params_v1');
      if (local) {
        var parsed = JSON.parse(local);
        if (parsed.priceOverrides) params.priceOverrides = parsed.priceOverrides;
        if (parsed.wordingOverrides) params.wordingOverrides = parsed.wordingOverrides;
      }
    } catch (e) {}
    return params;
  }

  window.CHIBA_PARAMS = {
    get: getParams,
    set: function(newParams) {
      try {
        localStorage.setItem('chiba_params_v1', JSON.stringify(newParams));
        applyParams();
      } catch (e) {}
    },
    reset: function() {
      try {
        localStorage.removeItem('chiba_params_v1');
        window.location.reload();
      } catch (e) {}
    }
  };

  function applyParams() {
    var params = getParams();
    var isEn = document.documentElement.lang && document.documentElement.lang.indexOf('en') === 0;
    var langKey = isEn ? 'en' : 'zh-tw';
    var words = (params.wordingOverrides && params.wordingOverrides[langKey]) || {};

    // 1. Apply Price Overrides on Product Detail Page
    var skuEl = document.querySelector('.sku');
    if (skuEl) {
      var skuMatch = skuEl.textContent.match(/\b\d{5,7}\b/);
      if (skuMatch) {
        var sku = skuMatch[0];
        if (params.priceOverrides && typeof params.priceOverrides[sku] !== 'undefined') {
          var customPrice = Number(params.priceOverrides[sku]);
          var priceEl = document.querySelector('[data-variant-price]');
          if (priceEl && !isNaN(customPrice)) {
            var isFitnessProduct = window.location.pathname.indexOf('/fitness/') !== -1 || (sku && sku.startsWith('4'));
            priceEl.textContent = (isEn ? 'RRP NT$ ' : (isFitnessProduct ? '台灣零售價 NT$ ' : '建議零售價 NT$ ')) + customPrice.toLocaleString();
          }
          // Update variant JSON data
          var vScript = document.querySelector('script[data-variant-data]');
          if (vScript) {
            try {
              var vData = JSON.parse(vScript.textContent);
              vData.forEach(function(v) {
                v.price = 'NT$ ' + customPrice.toLocaleString();
              });
              vScript.textContent = JSON.stringify(vData);
            } catch (e) {}
          }
        }
      }
    }

    // 2. Apply Price Overrides on Collection / Category Cards
    if (params.priceOverrides && Object.keys(params.priceOverrides).length > 0) {
      document.querySelectorAll('.products .card, .product-card').forEach(function(card) {
        var link = card.querySelector('a[href]');
        var href = link ? link.getAttribute('href') : '';
        for (var pSku in params.priceOverrides) {
          if (href.indexOf(pSku) !== -1 || (card.dataset && card.dataset.sku === pSku)) {
            var cardPrice = card.querySelector('.price') || card.querySelector('p:last-of-type');
            if (cardPrice) {
              var num = Number(params.priceOverrides[pSku]);
              if (!isNaN(num)) {
                cardPrice.textContent = 'NT$ ' + num.toLocaleString();
              }
            }
            break;
          }
        }
      });
    }

    // 3. Apply Wording Overrides
    // Topbar Tagline / Announcement
    if (typeof words.announcementBanner !== 'undefined') {
      var topbarEl = document.querySelector('.topbar-tagline');
      if (topbarEl) {
        if (words.announcementBanner === '') {
          topbarEl.style.display = 'none';
        } else {
          topbarEl.textContent = words.announcementBanner;
          topbarEl.style.display = '';
        }
      }
    }

    // Order Contact Button ("聯絡我們訂購")
    if (typeof words.orderContactButton !== 'undefined' && words.orderContactButton !== '') {
      var orderBtn = document.querySelector('.button.order-contact');
      if (orderBtn) {
        orderBtn.textContent = words.orderContactButton;
      }
    }

    // Preorder Notice Box
    if (typeof words.preorderNotice !== 'undefined') {
      var noticeBox = document.querySelector('.preorder-notice-box');
      if (noticeBox) {
        if (words.preorderNotice === '') {
          noticeBox.style.display = 'none';
        } else {
          var span = noticeBox.querySelector('span:last-child');
          if (span) span.textContent = words.preorderNotice;
          noticeBox.style.display = '';
        }
      }
    }
  }

  // Load remote parameters from Google Sheets Webhook (Option 3) or chiba-config.json (Option 1)
  try {
    var sheetsUrl = localStorage.getItem('chiba_sheets_webhook_url') || (window.CHIBA_CONFIG && window.CHIBA_CONFIG.googleSheetsWebhookUrl);
    if (sheetsUrl) {
      fetch(sheetsUrl)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data && (data.priceOverrides || data.wordingOverrides)) {
            var curr = getParams();
            if (data.priceOverrides) Object.assign(curr.priceOverrides, data.priceOverrides);
            if (data.wordingOverrides) {
              if (data.wordingOverrides['zh-tw']) Object.assign(curr.wordingOverrides['zh-tw'], data.wordingOverrides['zh-tw']);
              if (data.wordingOverrides['en']) Object.assign(curr.wordingOverrides['en'], data.wordingOverrides['en']);
            }
            localStorage.setItem('chiba_params_v1', JSON.stringify(curr));
            applyParams();
          }
        })
        .catch(function() {});
    } else if (!localStorage.getItem('chiba_params_v1')) {
      fetch('/assets/chiba-config.json')
        .then(function(res) { return res.json(); })
        .then(function(cfg) {
          if (cfg) {
            window.CHIBA_CONFIG = Object.assign(window.CHIBA_CONFIG || {}, cfg);
            if (cfg.priceOverrides || cfg.wordingOverrides) {
              localStorage.setItem('chiba_params_v1', JSON.stringify({
                priceOverrides: cfg.priceOverrides || {},
                wordingOverrides: cfg.wordingOverrides || { 'zh-tw': {}, 'en': {} }
              }));
              applyParams();
            }
          }
        })
        .catch(function() {});
    }
  } catch (e) {}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyParams);
  } else {
    applyParams();
  }
})();
