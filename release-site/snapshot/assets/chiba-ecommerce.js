// ==========================================================================
// CHIBA Taiwan - Pluggable E-Commerce Module (Option B)
// Decoupled, Zero-Pollution Add-on with 1-Second Master Kill-Switch
// ==========================================================================
(function() {
  'use strict';

  // 1. Master Kill-Switch Check
  window.CHIBA_CONFIG = window.CHIBA_CONFIG || {};
  try {
    var localPref = localStorage.getItem('chiba_ecommerce_active');
    if (localPref === null) {
      var rawCfg = localStorage.getItem('chiba_site_config_v1');
      if (rawCfg) {
        try {
          var parsedCfg = JSON.parse(rawCfg);
          if (typeof parsedCfg.enableEcommerce !== 'undefined') {
            localPref = parsedCfg.enableEcommerce ? 'true' : 'false';
          }
        } catch(e) {}
      }
    }
    if (localPref !== null) {
      window.CHIBA_CONFIG.enableEcommerce = (localPref === 'true');
    }
  } catch (e) {}
  if (window.CHIBA_CONFIG.enableEcommerce === undefined) {
    window.CHIBA_CONFIG.enableEcommerce = true;
  }
  if (!window.CHIBA_CONFIG.enableEcommerce) {
    return; // E-commerce disabled; pure static catalog mode
  }

  // 2. Constants & Storage Configuration
  var CART_STORAGE_KEY = 'chiba_cart_v1';
  var PROMO_STORAGE_KEY = 'chiba_promo_v1';
  var FREE_SHIPPING_THRESHOLD = 1500;
  var CVS_SHIPPING_FEE = 65;
  var isEn = document.documentElement.lang.startsWith('en');

  var VALID_PROMOS = {
    'PREORDER90': {
      code: 'PREORDER90',
      type: 'percent',
      rate: 0.10,
      label: isEn ? 'Pre-Order 10% OFF' : '德國原裝預購 9 折優惠'
    },
    'CHIBA100': {
      code: 'CHIBA100',
      type: 'fixed',
      amount: 100,
      label: isEn ? 'Welcome NT$ 100 OFF' : '首購現折 NT$ 100'
    }
  };

  // 2.1. Shopify Headless Integration Configuration (Mode A)
  var SHOPIFY_DEFAULT_DOMAIN = 'shop.chibataiwan.com';

  function getShopifyConfig() {
    var domain = SHOPIFY_DEFAULT_DOMAIN;
    var mode = 'shopify'; // 'shopify' (Mode A) or 'native'
    try {
      var rawCfg = localStorage.getItem('chiba_site_config_v1');
      if (rawCfg) {
        var parsed = JSON.parse(rawCfg);
        if (parsed.shopifyDomain) domain = parsed.shopifyDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        if (parsed.checkoutGateway) mode = parsed.checkoutGateway;
      }
    } catch(e) {}
    return {
      domain: domain,
      mode: mode,
      baseUrl: 'https://' + domain
    };
  }

  var LINE_BASE_URL = window.CHIBA_CONFIG.lineUrl || 'https://line.me/R/ti/p/@chibataiwan';

  // Order Quantity Limits & Bulk Inquiry Thresholds
  var ORDER_LIMITS = {
    MAX_PER_ITEM: 5,
    MAX_TOTAL_ITEMS: 10,
    MAX_COD_AMOUNT: 8000,
    SUPPORT_EMAIL: 'info@chibataiwan.com'
  };

  function showOrderLimitModal(type, context) {
    context = context || {};
    var modalId = 'chiba-limit-modal';
    var modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'chiba-limit-modal-backdrop';
      modal.innerHTML =
        '<div class="chiba-limit-modal-dialog" role="dialog" aria-modal="true">' +
          '<div class="chiba-limit-modal-header">' +
            '<h3 id="limit-modal-title"></h3>' +
            '<button type="button" class="chiba-limit-modal-close" id="limit-modal-close-btn" aria-label="Close">✕</button>' +
          '</div>' +
          '<div class="chiba-limit-modal-body" id="limit-modal-body"></div>' +
          '<div class="chiba-limit-modal-footer">' +
            '<a href="" class="chiba-limit-email-btn" id="limit-modal-email-btn" target="_blank" rel="noopener noreferrer"></a>' +
            '<button type="button" class="chiba-limit-close-action" id="limit-modal-dismiss-btn"></button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);

      var closeBtn = modal.querySelector('#limit-modal-close-btn');
      var dismissBtn = modal.querySelector('#limit-modal-dismiss-btn');
      function closeModal() {
        modal.classList.remove('is-open');
      }
      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      if (dismissBtn) dismissBtn.addEventListener('click', closeModal);
      modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
      });
    }

    var titleEl = modal.querySelector('#limit-modal-title');
    var bodyEl = modal.querySelector('#limit-modal-body');
    var emailBtn = modal.querySelector('#limit-modal-email-btn');
    var dismissBtn = modal.querySelector('#limit-modal-dismiss-btn');

    var subject = encodeURIComponent('CHIBA Taiwan 德國手套 大宗團購與大量採購洽詢');
    var emailHref = 'mailto:' + ORDER_LIMITS.SUPPORT_EMAIL + '?subject=' + subject;

    titleEl.textContent = isEn ? '🚴‍♂️ Bulk Order & Purchasing Inquiry' : '🚴‍♂️ CHIBA 德國原裝採購量上限提醒';
    dismissBtn.textContent = isEn ? 'Got it (Close)' : '我知道了 (關閉)';
    emailBtn.textContent = isEn ? '✉️ Contact Us via Email (info@chibataiwan.com)' : '✉️ 直接來信洽詢團購報價 (info@chibataiwan.com)';
    emailBtn.href = emailHref;

    var reasonHtml = '';
    if (type === 'per_item') {
      reasonHtml = isEn
        ? '<p>To ensure German authentic import air-freight schedules and highest quality control, online pre-orders are limited to <strong>' + ORDER_LIMITS.MAX_PER_ITEM + ' items per specification</strong>.</p>' +
          '<p>For cycling teams, fitness clubs, gym studios, or corporate bulk purchasing (5+ items), please contact us directly at <a href="' + emailHref + '"><strong>' + ORDER_LIMITS.SUPPORT_EMAIL + '</strong></a>! We will provide dedicated German volume pricing and consolidated logistics.</p>'
        : '<p>為維護德國原廠空運進口期程與最高品質防護，線上零售預購單一規格（同顏色/尺寸）限購 <strong>' + ORDER_LIMITS.MAX_PER_ITEM + ' 件</strong>。</p>' +
          '<p>若您為自行車隊、三鐵俱樂部、健身房教練團或企業機構有 5 件以上大宗團購需求，歡迎直接來信 <a href="' + emailHref + '"><strong>' + ORDER_LIMITS.SUPPORT_EMAIL + '</strong></a> 洽詢！我們將有專人為您安排德國原廠專屬團購報價與大宗物流服務。</p>';
    } else if (type === 'total_items') {
      reasonHtml = isEn
        ? '<p>Due to courier parcel size limitations (45×30×30 cm) and shipping safety protection, each online order is limited to <strong>' + ORDER_LIMITS.MAX_TOTAL_ITEMS + ' items total</strong>.</p>' +
          '<p>If your team or business requires 10+ items, please email us directly at <a href="' + emailHref + '"><strong>' + ORDER_LIMITS.SUPPORT_EMAIL + '</strong></a> for direct wholesale order handling and customized shipping.</p>'
        : '<p>考量超商包裹材積限制（長寬高 ≦ 105 公分）與商品運送防護安全，單筆線上訂單總件數上限為 <strong>' + ORDER_LIMITS.MAX_TOTAL_ITEMS + ' 件</strong>。</p>' +
          '<p>若您的車隊或團體有 10 件以上的大量採購需求，歡迎直接來信 <a href="' + emailHref + '"><strong>' + ORDER_LIMITS.SUPPORT_EMAIL + '</strong></a>，我們將提供專屬大宗採購合約與大型專車宅配運送！</p>';
    } else if (type === 'cod_limit') {
      reasonHtml = isEn
        ? '<p>According to convenience store cash collection safety limits, Cash on Delivery is available for orders up to <strong>NT$ 8,000</strong>.</p>' +
          '<p>For this order, please select <strong>Credit Card</strong> or <strong>ATM Virtual Account Transfer</strong>, or email us directly at <a href="' + emailHref + '"><strong>' + ORDER_LIMITS.SUPPORT_EMAIL + '</strong></a> for assistance.</p>'
        : '<p>依超商金流代收安全規範與防棄單機制，超商取貨付款僅適用於 <strong>NT$ 8,000 以下</strong> 之訂單。</p>' +
          '<p>本筆訂單金額超過上限，請改選「<strong>信用卡線上刷卡</strong>」或「<strong>ATM 虛擬帳號轉帳</strong>」完成結帳；或直接來信 <a href="' + emailHref + '"><strong>' + ORDER_LIMITS.SUPPORT_EMAIL + '</strong></a> 由客服專員為您處理。</p>';
    }

    bodyEl.innerHTML =
      '<div class="chiba-limit-badge-box">' +
        '<div class="chiba-limit-icon">⚠️</div>' +
        '<div class="chiba-limit-text">' + reasonHtml + '</div>' +
      '</div>';

    modal.classList.add('is-open');
  }

  window.showChibaOrderLimitModal = showOrderLimitModal;
  window.CHIBA_ORDER_LIMITS = ORDER_LIMITS;

  // 3. Bilingual Dictionary
  var i18n = {
    cartTitle: isEn ? 'Shopping Cart' : '我的購物車',
    emptyCart: isEn ? 'Your cart is currently empty' : '購物車目前是空的',
    emptyDesc: isEn ? 'Explore our German handcrafted cycling and fitness gloves.' : '歡迎挑選源自 1853 年德國百年工藝的頂級專業機能手套。',
    exploreProducts: isEn ? 'Explore Catalog' : '瀏覽全系列商品',
    freeShippingUnlocked: isEn ? '🎉 Congratulations! You have unlocked FREE shipping!' : '🎉 恭喜！您已享有全館免運費優惠！',
    freeShippingAway: function(amt) {
      return isEn ? 'Add NT$ ' + amt + ' more to qualify for FREE shipping!' : '還差 NT$ ' + amt + ' 享全館超商免運費！';
    },
    subtotal: isEn ? 'Subtotal' : '商品小計',
    promoDiscount: isEn ? 'Promo Discount' : '促銷折扣',
    estimatedShipping: isEn ? 'Estimated Shipping' : '預估運費 (超商取貨)',
    freeShipping: isEn ? 'FREE' : '免運費',
    total: isEn ? 'Total' : '含稅總計',
    checkout: isEn ? 'Proceed to Checkout →' : '前往結帳 →',
    shopifyCheckout: isEn ? 'Proceed to Shopify Checkout →' : '前往 Shopify 安全結帳 →',
    lineCheckout: isEn ? 'Quick Order via LINE' : '🟢 LINE 專人快速諮詢 / 訂購',
    addToCart: isEn ? 'Add to Cart' : '🛒 加入購物車',
    buyNow: isEn ? '⚡ Buy Now' : '⚡ 立即購買',
    shopifyBuyNow: isEn ? '⚡ 前往官方旗艦店購買' : '⚡ 前往官方旗艦店購買',
    preorderBadge: isEn ? '🇩🇪 Official' : '🇩🇪 官方正品',
    selectSize: isEn ? 'Available Sizes' : '可用尺寸',
    sizeGuideTitle: isEn ? '📏 Size Chart & Guide' : '📏 尺寸對照表',
    modalTitle: isEn ? 'CHIBA Glove Size Guide' : 'CHIBA 德國手套標準尺寸對照表',
    modalFormula: isEn ? 'Measurement Standard: Palm Circumference (cm)' : '測量標準：手掌圍（公分 cm）',
    modalDesc: isEn
      ? 'German professional sports gloves are tailored based on palm circumference. Use a soft tape to measure around the widest part of your hand (above thumb joint, excluding thumb) to find your ideal fit:'
      : '德國原廠專業運動手套依掌圍公分標準剪裁。請使用軟尺環繞手掌最寬處（虎口上方、不含大拇指）測量掌圍，即可對照最適合您的手套尺寸：',
    calcPrompt: isEn ? 'Enter your palm circumference (cm):' : '輸入您的手掌圍（公分）：',
    calcBtn: isEn ? 'Find My Size' : '試算我的尺寸',
    recommendedSize: function(sz, cm) {
      return isEn ? 'Recommended Size: ' + sz + ' (Palm ~' + cm + ' cm)' : '建議尺寸：' + sz + '（參考掌圍 ' + cm + ' 公分）';
    },
    itemsCount: function(n) {
      return isEn ? n + ' item' + (n > 1 ? 's' : '') : '共 ' + n + ' 件商品';
    },
    remove: isEn ? 'Remove' : '移除',
    inquireB2B: isEn ? 'Authorized Dealer & Wholesale Inquiry' : '經銷商合作與通路洽詢',
    guarantee: isEn ? '100% German Quality · 7-Day Inspection · Official Taiwan Warranty' : '100% 德國原裝正品 · 台灣消保法 7 天猶豫期 · 官方代理售後保固'
  };

  // 4. Cart Engine (LocalStorage CRUD)
  function getCart() {
    try {
      var data = localStorage.getItem(CART_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (_) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      updateCartUI();
    } catch (_) {}
  }

  function getCartCount() {
    var cart = getCart();
    return cart.reduce(function(sum, item) { return sum + (item.qty || 1); }, 0);
  }

  function getCartSubtotal() {
    var cart = getCart();
    return cart.reduce(function(sum, item) { return sum + (item.price || 0) * (item.qty || 1); }, 0);
  }

  function addToCart(item) {
    var cart = getCart();
    var existing = cart.find(function(i) { return i.id === item.id; });
    var currentItemQty = existing ? (existing.qty || 1) : 0;
    var addQty = item.qty || 1;
    var currentTotalCount = getCartCount();

    if (currentItemQty + addQty > ORDER_LIMITS.MAX_PER_ITEM) {
      showOrderLimitModal('per_item', { itemTitle: item.title });
      return false;
    }
    if (currentTotalCount + addQty > ORDER_LIMITS.MAX_TOTAL_ITEMS) {
      showOrderLimitModal('total_items', {});
      return false;
    }

    if (existing) {
      existing.qty = (existing.qty || 1) + addQty;
    } else {
      cart.push(item);
    }
    saveCart(cart);
    openCartDrawer();
    return true;
  }

  function updateItemQty(id, delta) {
    var cart = getCart();
    var item = cart.find(function(i) { return i.id === id; });
    if (!item) return;

    if (delta > 0) {
      if ((item.qty || 1) + delta > ORDER_LIMITS.MAX_PER_ITEM) {
        showOrderLimitModal('per_item', { itemTitle: item.title });
        return;
      }
      if (getCartCount() + delta > ORDER_LIMITS.MAX_TOTAL_ITEMS) {
        showOrderLimitModal('total_items', {});
        return;
      }
    }

    item.qty = (item.qty || 1) + delta;
    if (item.qty <= 0) {
      cart = cart.filter(function(i) { return i.id !== id; });
    }
    saveCart(cart);
  }

  function removeItem(id) {
    var cart = getCart();
    cart = cart.filter(function(i) { return i.id !== id; });
    saveCart(cart);
  }

  // Promo Code Engine (Multi-Code & Stacking Support)
  function getAppliedPromos() {
    try {
      var raw = localStorage.getItem(PROMO_STORAGE_KEY);
      if (!raw) return [];
      var obj = JSON.parse(raw);
      var codeList = [];
      if (Array.isArray(obj.codes)) {
        codeList = obj.codes;
      } else if (obj && obj.code) {
        codeList = [obj.code];
      }
      var validList = [];
      var seen = {};
      for (var i = 0; i < codeList.length; i++) {
        var c = String(codeList[i]).trim().toUpperCase();
        if (VALID_PROMOS[c] && !seen[c]) {
          seen[c] = true;
          validList.push(VALID_PROMOS[c]);
        }
      }
      return validList;
    } catch (_) {
      return [];
    }
  }

  function addAppliedPromo(code) {
    try {
      if (!code) return { success: false, reason: 'empty' };
      var inputCodes = code.split(/[,+\s]+/).map(function(s) { return s.trim().toUpperCase(); }).filter(Boolean);
      if (inputCodes.length === 0) return { success: false, reason: 'empty' };

      var current = getAppliedPromos().map(function(p) { return p.code; });
      var addedCount = 0;
      var invalidCount = 0;

      for (var i = 0; i < inputCodes.length; i++) {
        var c = inputCodes[i];
        if (VALID_PROMOS[c]) {
          if (current.indexOf(c) === -1) {
            current.push(c);
            addedCount++;
          }
        } else {
          invalidCount++;
        }
      }

      if (addedCount > 0 || (invalidCount === 0 && current.length > 0)) {
        localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify({ codes: current }));
        return { success: true, added: addedCount, current: getAppliedPromos() };
      }
      return { success: false, reason: 'invalid' };
    } catch (_) {
      return { success: false, reason: 'error' };
    }
  }

  function removeAppliedPromo(code) {
    try {
      var current = getAppliedPromos().map(function(p) { return p.code; });
      if (code) {
        var upper = code.trim().toUpperCase();
        current = current.filter(function(c) { return c !== upper; });
      } else {
        current = [];
      }
      if (current.length > 0) {
        localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify({ codes: current }));
      } else {
        localStorage.removeItem(PROMO_STORAGE_KEY);
      }
      return getAppliedPromos();
    } catch (_) {
      return [];
    }
  }

  function calculatePromoDiscounts(subtotal, promos) {
    if (!promos || !promos.length || !subtotal) {
      return { totalDiscount: 0, details: [], payable: subtotal };
    }
    var totalDiscount = 0;
    var details = [];
    for (var i = 0; i < promos.length; i++) {
      var p = promos[i];
      var d = 0;
      if (p.type === 'percent') {
        d = Math.round(subtotal * p.rate);
      } else if (p.type === 'fixed') {
        d = Math.min(subtotal, p.amount);
      }
      details.push({
        code: p.code,
        label: p.label,
        type: p.type,
        discount: d
      });
      totalDiscount += d;
    }
    totalDiscount = Math.min(subtotal, totalDiscount);
    return {
      totalDiscount: totalDiscount,
      details: details,
      payable: Math.max(0, subtotal - totalDiscount)
    };
  }

  // Backward-compatible single promo wrappers
  function getAppliedPromo() {
    var list = getAppliedPromos();
    return list.length > 0 ? list[0] : null;
  }
  function setAppliedPromo(code) {
    if (!code) {
      removeAppliedPromo();
      return null;
    }
    var res = addAppliedPromo(code);
    return res.success ? (res.current[0] || null) : false;
  }
  function calculateDiscount(subtotal, promo) {
    if (!promo) return 0;
    var res = calculatePromoDiscounts(subtotal, [promo]);
    return res.totalDiscount;
  }

  // Official German CHIBA Fitness Size Availability Matrix (from Factory Catalog Matrix)
  var FITNESS_SIZE_MATRIX = {
    // Premium Line
    '42126': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '42145': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '42155': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '42166': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '42176': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    // Workout Line
    '40125': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '40111': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '40135': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '40165': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '40148': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '40175': ['S/M', 'L/XL'],
    '40186': ['S/M', 'L/XL', 'XXL'],
    // Allround Line
    '40400': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '40415': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '40425': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    // Lady Line
    '40945': ['XS', 'S', 'M', 'L'],
    '40921': ['XS', 'S', 'M', 'L'],
    '40911': ['XS', 'S', 'M', 'L'],
    '40955': ['XS', 'S', 'M', 'L'],
    '40971': ['XS', 'S', 'M', 'L'],
    // Strongman Line
    '44102': ['S', 'M', 'L', 'XL', 'XXL'],
    '40630': ['ONE SIZE'],
    '40860': ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
    '44612': ['ONE SIZE'],
    '44756': ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    '44766': ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    '44476': ['ONE SIZE'],
    '44486': ['ONE SIZE'],
    // Accessories
    '40605': ['ONE SIZE'],
    '40615': ['ONE SIZE'],
    '40610': ['ONE SIZE'],
    '40627': ['ONE SIZE'],
    '40958': ['ONE SIZE'],
    '40655': ['ONE SIZE'],
    '40700': ['ONE SIZE'],
    '40745': ['ONE SIZE'],
    '40717': ['ONE SIZE'],
    '40710': ['ONE SIZE'],
    '40720': ['ONE SIZE'],
    '40794': ['ONE SIZE'],
    '40426': ['ONE SIZE'],
    '40436': ['ONE SIZE'],
    '40476': ['ONE SIZE'],
    '40486': ['ONE SIZE'],
    '40755': ['ONE SIZE'],
    // Belts
    '40810': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
    '40828': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '42812': ['S', 'M', 'L', 'XL', 'XXL'],
    '40838': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '40840': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '40866': ['S', 'M', 'L', 'XL', 'XXL'],
    '40875': ['XS', 'S', 'M', 'L'],
    '40886': ['S', 'M', 'L', 'XL', 'XXL'],
    '40890': ['ONE SIZE'],
    '40897': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    // Cycling re-categorized
    '30410': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    '3040018': ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  };

  // Helper: Parse sizes from string (e.g. "XS, S, M, L, XL, XXL, 3XL", "XS-4XL", "Onesize")
  function parseSizes(str, sku) {
    var cleanSku = sku ? String(sku).trim() : '';
    if (cleanSku && FITNESS_SIZE_MATRIX[cleanSku]) {
      return FITNESS_SIZE_MATRIX[cleanSku].map(function(s) {
        if (s === 'ONE SIZE' || s.toLowerCase() === 'onesize') {
          return isEn ? 'One Size' : '單一尺寸';
        }
        return s;
      });
    }
    if (!str) return ['M'];
    str = str.trim();
    if (str.toLowerCase() === 'onesize' || str.toLowerCase() === 'one size') {
      return [isEn ? 'One Size' : '單一尺寸'];
    }
    if (str === 'XS-XXL') return ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    if (str === 'XS-L') return ['XS', 'S', 'M', 'L'];
    if (str === 'S-XXL') return ['S', 'M', 'L', 'XL', 'XXL'];
    if (str === 'S-3XL') return ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
    if (str === 'XS-4XL') return ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
    if (str === 'S-4XL') return ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
    var list = [];
    if (str.indexOf(',') !== -1) {
      list = str.split(',').map(function(s) {
        return s.trim().replace(/^[^:]+:\s*/, '');
      }).filter(Boolean);
    } else {
      list = [str];
    }
    var isFitness = window.location.pathname.indexOf('/fitness/') !== -1 || (sku && String(sku).trim().startsWith('4'));
    if (isFitness && !['40810', '40860'].includes(cleanSku)) {
      list = list.filter(function(s) { return s !== '4XL'; });
    }
    return list.length ? list : ['M'];
  }

  // 5. Build & Mount UI Elements

  // Member Management & First-Time Purchase Anti-Abuse Engine
  var MEMBER_CURRENT_KEY = 'chiba_current_member_v1';
  var MEMBERS_LIST_KEY = 'chiba_members_v1';

  function getLoggedInMember() {
    try {
      var raw = localStorage.getItem(MEMBER_CURRENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function getAllMembers() {
    try {
      var raw = localStorage.getItem(MEMBERS_LIST_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function setLoggedInMember(member) {
    try {
      if (member) {
        localStorage.setItem(MEMBER_CURRENT_KEY, JSON.stringify(member));
        var members = getAllMembers();
        var cleanPhone = String(member.phone || '').replace(/[^0-9]/g, '');
        var idx = members.findIndex(function(m) {
          return String(m.phone || '').replace(/[^0-9]/g, '') === cleanPhone;
        });
        if (idx >= 0) {
          members[idx] = Object.assign({}, members[idx], member);
        } else {
          members.push(member);
        }
        localStorage.setItem(MEMBERS_LIST_KEY, JSON.stringify(members));
      } else {
        localStorage.removeItem(MEMBER_CURRENT_KEY);
      }
      updateHeaderMemberUI();
    } catch (e) {
      console.error('Error saving member', e);
    }
  }

  function logoutMember() {
    setLoggedInMember(null);
    window.location.reload();
  }

  function checkFirstTimePurchaseEligibility(phone) {
    if (!phone) return { eligible: true };
    var cleanPhone = String(phone).replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) return { eligible: true };

    try {
      var raw = localStorage.getItem('chiba_order_history_v1');
      var orders = raw ? JSON.parse(raw) : [];
      var prior = orders.find(function(order) {
        var oPhone = String((order.recipient && order.recipient.phone) || order.phone || '').replace(/[^0-9]/g, '');
        if (!oPhone || oPhone !== cleanPhone) return false;
        var codes = Array.isArray(order.promoCodes) ? order.promoCodes : (order.promoCode ? [order.promoCode] : []);
        return codes.some(function(c) {
          return String(c).toUpperCase().indexOf('CHIBA100') !== -1;
        });
      });

      if (prior) {
        return {
          eligible: false,
          reason: 'ALREADY_USED',
          pastOrderId: prior.orderId
        };
      }
    } catch (e) {
      console.error('Error checking first time purchase', e);
    }
    return { eligible: true };
  }

  function updateHeaderMemberUI() {
    var memberBtn = document.querySelector('.nav-member-btn');
    if (!memberBtn) return;
    var member = getLoggedInMember();
    var accountUrl = isEn ? '/en/account/' : '/zh-tw/account/';
    if (member) {
      memberBtn.href = accountUrl;
      memberBtn.innerHTML =
        '<svg class="nav-member-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' +
        '<span class="nav-member-text">' + (member.name ? member.name.slice(0, 4) : (isEn ? 'Account' : '會員專區')) + '</span>';
      memberBtn.title = isEn ? 'Member Center' : '會員中心看板';
      memberBtn.onclick = null;
    } else {
      memberBtn.removeAttribute('href');
      memberBtn.innerHTML =
        '<svg class="nav-member-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' +
        '<span class="nav-member-text">' + (isEn ? 'Login / Claim $100' : '登入 / 領$100') + '</span>' +
        '<span class="nav-member-gift">🎁 $100</span>';
      memberBtn.title = isEn ? 'Register / Login to claim NT$ 100' : '註冊會員領取 NT$ 100 首購折價券';
      memberBtn.onclick = function(e) {
        e.preventDefault();
        openMemberModal('register');
      };
    }
  }

  // Mount Header Online Store Pill Link (Mode A Dual-Store Integration)
  function mountHeaderStoreButton() {
    var primaryNav = document.getElementById('primary-navigation');
    if (!primaryNav || primaryNav.querySelector('.nav-store-link')) return;

    var shopifyCfg = getShopifyConfig();
    var storeLink = document.createElement('a');
    storeLink.className = 'nav-store-link';
    storeLink.href = shopifyCfg.baseUrl;
    storeLink.target = '_blank';
    storeLink.rel = 'noopener noreferrer';
    storeLink.innerHTML = isEn ? '🛍️ Shop Online' : '🛍️ 線上旗艦店';
    storeLink.setAttribute('title', isEn ? 'CHIBA Taiwan Official Online Store (Shopify)' : 'CHIBA 台灣官方線上旗艦店 (Shopify)');

    primaryNav.appendChild(storeLink);
  }

  function mountHeaderMemberButton() {
    var navActions = document.querySelector('.nav-actions');
    if (!navActions || navActions.querySelector('.nav-member-btn')) return;

    var memberBtn = document.createElement('a');
    memberBtn.className = 'nav-member-btn';
    memberBtn.id = 'nav-member-btn';

    var cartBtn = navActions.querySelector('.nav-cart-btn');
    var menuBtn = navActions.querySelector('.menu');
    if (cartBtn) {
      navActions.insertBefore(memberBtn, cartBtn);
    } else if (menuBtn) {
      navActions.insertBefore(memberBtn, menuBtn);
    } else {
      navActions.appendChild(memberBtn);
    }
    updateHeaderMemberUI();
  }

  function openMemberModal(initialTab) {
    var modal = document.getElementById('chiba-member-modal');
    if (!modal) {
      mountMemberModal();
      modal = document.getElementById('chiba-member-modal');
    }
    if (modal) {
      modal.classList.add('is-open');
      document.body.classList.add('cart-drawer-open');
      if (initialTab === 'login') {
        switchMemberTab('login');
      } else {
        switchMemberTab('register');
      }
    }
  }

  function closeMemberModal() {
    var modal = document.getElementById('chiba-member-modal');
    if (modal) {
      modal.classList.remove('is-open');
      document.body.classList.remove('cart-drawer-open');
    }
  }

  function switchMemberTab(tab) {
    var regTabBtn = document.getElementById('tab-btn-register');
    var loginTabBtn = document.getElementById('tab-btn-login');
    var regPane = document.getElementById('tab-pane-register');
    var loginPane = document.getElementById('tab-pane-login');
    if (!regTabBtn || !loginTabBtn || !regPane || !loginPane) return;

    if (tab === 'login') {
      loginTabBtn.classList.add('is-active');
      regTabBtn.classList.remove('is-active');
      loginPane.classList.add('is-active');
      regPane.classList.remove('is-active');
    } else {
      regTabBtn.classList.add('is-active');
      loginTabBtn.classList.remove('is-active');
      regPane.classList.add('is-active');
      loginPane.classList.remove('is-active');
    }
  }

  function mountMemberModal() {
    if (document.getElementById('chiba-member-modal')) return;

    var backdrop = document.createElement('div');
    backdrop.id = 'chiba-member-modal';
    backdrop.className = 'member-modal-backdrop';
    backdrop.innerHTML =
      '<div class="member-modal-dialog" role="dialog" aria-modal="true">' +
        '<div class="member-modal-header">' +
          '<h3 class="member-modal-title">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#d42b31" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' +
            (isEn ? 'CHIBA Member Center' : 'CHIBA 官方會員專區') +
          '</h3>' +
          '<button type="button" class="member-modal-close" id="member-modal-close-btn" aria-label="Close">✕</button>' +
        '</div>' +
        '<div class="member-tabs">' +
          '<button type="button" class="member-tab-btn is-active" id="tab-btn-register">' + (isEn ? '🎁 Sign Up & Claim $100' : '🎁 註冊領 NT$ 100 首購金') + '</button>' +
          '<button type="button" class="member-tab-btn" id="tab-btn-login">' + (isEn ? '👤 Member Login' : '👤 會員快速登入') + '</button>' +
        '</div>' +
        '<div class="member-tab-pane is-active" id="tab-pane-register">' +
          '<div class="member-bonus-box">' +
            '<span>🏷️</span>' +
            '<div><strong>' + (isEn ? 'Welcome Gift: NT$ 100 OFF' : '新會員見面禮：現領 NT$ 100 首購折價券') + '</strong><br>' +
            (isEn ? 'Bound directly to your verified phone number, stackable with 10% OFF pre-order!' : '綁定驗證手機門號，可與全品項德國原裝預購 9 折 (PREORDER90) 同時疊加折抵！') + '</div>' +
          '</div>' +
          '<form id="member-register-form">' +
            '<div class="member-form-group">' +
              '<label for="reg-name">' + (isEn ? 'Full Name * (For pickup verification)' : '收件人真實姓名 * (超商取件核對證件)') + '</label>' +
              '<input type="text" id="reg-name" class="member-form-input" required placeholder="' + (isEn ? 'e.g. John Doe' : '請填寫證件相符真實姓名') + '">' +
              '<div class="member-field-reminder">' +
                (isEn
                  ? '⚠️ <strong>Pickup Notice</strong>: Please enter your legal name as shown on your ID. This is required by Taiwan 7-ELEVEN for <strong>identity verification</strong>; mismatched names will not be released.'
                  : '⚠️ <strong>取件提醒</strong>：請填寫與證件相符之身分證中文姓名。此為台灣 7-ELEVEN<strong>「取件核對身分證件」之必備項目</strong>，姓名不符將無法領貨。') +
              '</div>' +
            '</div>' +
            '<div class="member-form-group">' +
              '<label for="reg-phone">' + (isEn ? 'Mobile Phone * (Verification Key)' : '手機號碼 * (接收取貨通知與唯一防刷金鑰)') + '</label>' +
              '<input type="tel" id="reg-phone" class="member-form-input" required pattern="09[0-9]{8}" placeholder="09xxxxxxxx">' +
            '</div>' +
            '<div class="member-form-group">' +
              '<label for="reg-email">' + (isEn ? 'Email Address * (For receipts & E-Invoice)' : '電子信箱 * (接收電子發票與訂單確認)') + '</label>' +
              '<input type="email" id="reg-email" class="member-form-input" required placeholder="name@example.com">' +
            '</div>' +
            '<div class="member-form-group" style="display:flex;align-items:center;gap:8px;font-size:0.84rem;color:#475569;">' +
              '<input type="checkbox" id="reg-quick-auth" checked style="accent-color:#d42b31;">' +
              '<label for="reg-quick-auth" style="margin:0;cursor:pointer;">' + (isEn ? 'Enable 1-Click Phone/SMS verification (No password to remember)' : '啟用手機快速安全登入（免記繁雜密碼）') + '</label>' +
            '</div>' +
            '<div id="reg-feedback" style="display:none;margin-bottom:12px;font-size:0.84rem;padding:8px 12px;border-radius:6px;"></div>' +
            '<button type="submit" class="btn-member-submit" id="btn-submit-register">' +
              '⚡ ' + (isEn ? 'Register & Claim NT$ 100 Welcome Discount' : '立即註冊並領取 NT$ 100 首購折價券') +
            '</button>' +
          '</form>' +
        '</div>' +
        '<div class="member-tab-pane" id="tab-pane-login">' +
          '<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; margin-bottom:14px; font-size:0.82rem; color:#475569; line-height:1.45;">' +
            '💡 ' + (isEn ? '<strong>Quick Login</strong>: Enter your registered phone number and the last 3 digits to sign in instantly without remembering passwords.' : '<strong>推薦免記密碼快速登入</strong>：直接以手機號碼作為帳號，輸入「手機末 3 碼」即可快速安全驗證，完全不需記憶繁雜密碼！') +
          '</div>' +
          '<form id="member-login-form">' +
            '<div class="member-form-group">' +
              '<label for="login-phone">' + (isEn ? 'Registered Mobile Phone / Email *' : '會員手機號碼 / 電子信箱 *') + '</label>' +
              '<input type="text" id="login-phone" class="member-form-input" required placeholder="09xxxxxxxx / name@example.com">' +
            '</div>' +
            '<div class="member-form-group">' +
              '<label for="login-code">' + (isEn ? 'Phone Last 3 Digits or Password *' : '手機末 3 碼 或 會員密碼 *') + '</label>' +
              '<input type="password" id="login-code" class="member-form-input" required placeholder="' + (isEn ? 'Enter last 3 digits of phone' : '輸入手機末 3 碼快速登入') + '">' +
            '</div>' +
            '<div id="login-feedback" style="display:none;margin-bottom:12px;font-size:0.84rem;padding:8px 12px;border-radius:6px;"></div>' +
            '<button type="submit" class="btn-member-submit" id="btn-submit-login" style="background:#111827;">' +
              '👤 ' + (isEn ? 'Sign In to Member Center' : '會員安全登入') +
            '</button>' +
          '</form>' +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);

    backdrop.querySelector('#member-modal-close-btn').addEventListener('click', closeMemberModal);
    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop) closeMemberModal();
    });

    document.getElementById('tab-btn-register').addEventListener('click', function() { switchMemberTab('register'); });
    document.getElementById('tab-btn-login').addEventListener('click', function() { switchMemberTab('login'); });

    document.getElementById('member-register-form').addEventListener('submit', function(e) {
      e.preventDefault();
      var name = document.getElementById('reg-name').value.trim();
      var phone = document.getElementById('reg-phone').value.trim();
      var email = document.getElementById('reg-email').value.trim();
      var feedback = document.getElementById('reg-feedback');

      if (!name || !phone || !email) return;

      var check = checkFirstTimePurchaseEligibility(phone);
      var memberObj = {
        name: name,
        phone: phone,
        email: email,
        registeredAt: new Date().toISOString(),
        hasUsedFirstPurchase: !check.eligible
      };

      setLoggedInMember(memberObj);

      if (check.eligible) {
        addAppliedPromo('CHIBA100');
        feedback.style.display = 'block';
        feedback.style.background = '#ecfdf5';
        feedback.style.color = '#065f46';
        feedback.style.border = '1px solid #a7f3d0';
        feedback.innerHTML = '🎉 <strong>' + (isEn ? 'Welcome to CHIBA!' : '註冊成功！') + '</strong> ' + 
          (isEn ? 'NT$ 100 Welcome coupon auto-applied to your cart.' : 'NT$ 100 首購禮券已自動發放並套用於購物車！');
        
        setTimeout(function() {
          closeMemberModal();
          updateCartUI();
          openCartDrawer();
        }, 1100);
      } else {
        feedback.style.display = 'block';
        feedback.style.background = '#fffbeb';
        feedback.style.color = '#92400e';
        feedback.style.border = '1px solid #fde68a';
        feedback.innerHTML = '👋 <strong>' + (isEn ? 'Welcome Back!' : '歡迎回來！') + '</strong> ' +
          (isEn ? 'Member profile updated. Your 10% OFF pre-order discount is ready.' : '您已是 CHIBA 尊榮會員，過往已完成首購，已為您保留全館原裝預購 9 折 (PREORDER90)！');

        setTimeout(function() {
          closeMemberModal();
          updateCartUI();
        }, 1400);
      }
    });

    document.getElementById('member-login-form').addEventListener('submit', function(e) {
      e.preventDefault();
      var account = document.getElementById('login-phone').value.trim();
      var feedback = document.getElementById('login-feedback');
      var cleanPhone = account.replace(/[^0-9]/g, '');

      var members = getAllMembers();
      var matched = members.find(function(m) {
        return (m.phone && m.phone.replace(/[^0-9]/g, '') === cleanPhone) || m.email === account;
      });

      if (!matched && cleanPhone.length >= 9) {
        matched = {
          name: isEn ? 'Member' : 'CHIBA 會員',
          phone: cleanPhone,
          email: account.indexOf('@') !== -1 ? account : '',
          registeredAt: new Date().toISOString()
        };
      }

      if (matched) {
        setLoggedInMember(matched);
        feedback.style.display = 'block';
        feedback.style.background = '#ecfdf5';
        feedback.style.color = '#065f46';
        feedback.style.border = '1px solid #a7f3d0';
        feedback.innerHTML = '✔ ' + (isEn ? 'Login successful! Redirecting to Member Center...' : '登入成功！正在前往會員專區...');
        setTimeout(function() {
          closeMemberModal();
          window.location.href = isEn ? '/en/account/' : '/zh-tw/account/';
        }, 700);
      } else {
        feedback.style.display = 'block';
        feedback.style.background = '#fef2f2';
        feedback.style.color = '#991b1b';
        feedback.style.border = '1px solid #fecaca';
        feedback.innerHTML = '❌ ' + (isEn ? 'Account not found. Please register first.' : '查無此會員資料，請先切換至「註冊」領取首購金！');
      }
    });
  }

  // Mount Header Shopping Bag Button
  function mountHeaderCartButton() {
    var navActions = document.querySelector('.nav-actions');
    if (!navActions || navActions.querySelector('.nav-cart-btn')) return;

    var cartBtn = document.createElement('button');
    cartBtn.className = 'nav-cart-btn';
    cartBtn.setAttribute('type', 'button');
    cartBtn.setAttribute('aria-label', i18n.cartTitle);
    cartBtn.title = i18n.cartTitle;
    cartBtn.innerHTML =
      '<svg class="cart-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M1.5 4.5h3.2l2.4 10.5h10.8l1.8-7.5H5.2"></path>' +
        '<line x1="6.5" y1="9.5" x2="19.2" y2="9.5"></line>' +
        '<line x1="7.2" y1="12.5" x2="18.2" y2="12.5"></line>' +
        '<circle cx="8" cy="18.8" r="1.5" stroke-width="2" fill="#fff"></circle>' +
        '<circle cx="16.5" cy="18.8" r="1.5" stroke-width="2" fill="#fff"></circle>' +
      '</svg>' +
      '<span class="cart-badge" data-cart-count>0</span>';

    cartBtn.addEventListener('click', openCartDrawer);

    var menuBtn = navActions.querySelector('.menu');
    if (menuBtn) {
      navActions.insertBefore(cartBtn, menuBtn);
    } else {
      navActions.appendChild(cartBtn);
    }
  }

  // Mount Slide-out Cart Drawer
  function mountCartDrawer() {
    if (document.getElementById('chiba-cart-drawer')) return;

    var root = document.createElement('div');
    root.id = 'chiba-cart-drawer-root';
    root.innerHTML =
      '<div class="cart-overlay" id="chiba-cart-overlay" aria-hidden="true"></div>' +
      '<aside class="cart-drawer" id="chiba-cart-drawer" role="dialog" aria-modal="true" aria-label="' + i18n.cartTitle + '" aria-hidden="true">' +
        '<div class="cart-header">' +
          '<div class="cart-title-wrap">' +
            '<svg class="cart-title-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M1.5 4.5h3.2l2.4 10.5h10.8l1.8-7.5H5.2"></path>' +
              '<line x1="6.5" y1="9.5" x2="19.2" y2="9.5"></line>' +
              '<line x1="7.2" y1="12.5" x2="18.2" y2="12.5"></line>' +
              '<circle cx="8" cy="18.8" r="1.5" stroke-width="2" fill="#fff"></circle>' +
              '<circle cx="16.5" cy="18.8" r="1.5" stroke-width="2" fill="#fff"></circle>' +
            '</svg>' +
            '<h2>' + i18n.cartTitle + '</h2>' +
            '<span class="cart-header-count" data-cart-header-count></span>' +
          '</div>' +
          '<button type="button" class="cart-close-btn" id="chiba-cart-close" aria-label="Close cart">✕</button>' +
        '</div>' +

        '<div class="cart-shipping-bar" id="chiba-cart-shipping-bar">' +
          '<div class="cart-shipping-msg" data-shipping-msg></div>' +
          '<div class="cart-shipping-progress">' +
            '<div class="cart-shipping-fill" data-shipping-fill style="width: 0%;"></div>' +
          '</div>' +
        '</div>' +

        '<div class="cart-body" id="chiba-cart-body"></div>' +

        '<div class="cart-footer" id="chiba-cart-footer">' +
          '<div class="cart-promo-section">' +
            '<div class="cart-promo-applied" id="cart-promo-applied" style="display: none; flex-direction: column; gap: 6px;">' +
              '<div class="cart-promo-tags" id="cart-promo-tags"></div>' +
            '</div>' +
            '<div class="cart-promo-form" id="cart-promo-form">' +
              '<input type="text" id="cart-promo-input" class="cart-promo-input" placeholder="' + i18n.promoPlaceholder + '">' +
              '<button type="button" id="cart-promo-apply-btn" class="cart-promo-btn">' + i18n.applyPromo + '</button>' +
            '</div>' +
            '<div class="cart-promo-stack-box" id="cart-promo-stack-box" style="display: none;"></div>' +
            '<div class="cart-promo-msg" id="cart-promo-msg"></div>' +
          '</div>' +
          '<div class="cart-summary-row">' +
            '<span>' + i18n.subtotal + '</span>' +
            '<strong data-cart-subtotal>NT$ 0</strong>' +
          '</div>' +
          '<div class="cart-summary-row cart-discount-row" id="cart-discount-row" style="display: none;">' +
            '<span id="cart-discount-label">' + i18n.promoDiscount + '</span>' +
            '<strong id="cart-discount-amount">-NT$ 0</strong>' +
          '</div>' +
          '<div id="cart-discount-breakdown"></div>' +
          '<div class="cart-summary-row">' +
            '<span>' + i18n.estimatedShipping + '</span>' +
            '<span data-cart-shipping>' + i18n.freeShipping + '</span>' +
          '</div>' +
          '<div class="cart-summary-row cart-total-row">' +
            '<span>' + i18n.total + '</span>' +
            '<strong class="cart-total-price" data-cart-total>NT$ 0</strong>' +
          '</div>' +
          '<a href="' + (isEn ? '/en/checkout/' : '/zh-tw/checkout/') + '" class="cart-checkout-btn" id="chiba-cart-checkout-btn">' + (getShopifyConfig().mode !== 'native' ? i18n.shopifyCheckout : i18n.checkout) + '</a>' +
          '<a href="#" target="_blank" rel="noopener noreferrer" class="cart-line-consult-btn" data-cart-line-btn>' +
            '<svg class="cart-line-icon" viewBox="0 0 24 24"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>' +
            i18n.lineCheckout +
          '</a>' +
          '<p class="cart-guarantee-note">' +
            '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>' +
            i18n.guarantee +
          '</p>' +
        '</div>' +
      '</aside>';

    document.body.appendChild(root);

    document.getElementById('chiba-cart-close').addEventListener('click', closeCartDrawer);
    document.getElementById('chiba-cart-overlay').addEventListener('click', closeCartDrawer);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isCartDrawerOpen()) {
        closeCartDrawer();
      }
    });

    var cartCheckoutBtn = document.getElementById('chiba-cart-checkout-btn');
    if (cartCheckoutBtn) {
      cartCheckoutBtn.addEventListener('click', function(e) {
        var shopifyCfg = getShopifyConfig();
        if (shopifyCfg.mode !== 'native') {
          e.preventDefault();
          var cartItems = getCart();
          if (cartItems.length === 1 && cartItems[0].sku) {
            var cat = (cartItems[0].url && cartItems[0].url.indexOf('cycling') !== -1) ? 'cycling' : 'fitness';
            window.location.href = shopifyCfg.baseUrl + '/products/chiba-' + encodeURIComponent(cartItems[0].sku) + '-' + cat;
          } else {
            window.location.href = shopifyCfg.baseUrl + '/cart';
          }
        }
      });
    }

    // Promo Code Listeners in Drawer
    var applyBtn = document.getElementById('cart-promo-apply-btn');
    var promoInput = document.getElementById('cart-promo-input');
    var promoMsg = document.getElementById('cart-promo-msg');

    function handleApplyPromo() {
      var code = promoInput.value.trim().toUpperCase();
      if (!code) return;
      var res = addAppliedPromo(code);
      if (res.success) {
        if (promoMsg) {
          promoMsg.textContent = i18n.promoAppliedSuccess;
          promoMsg.className = 'cart-promo-msg';
        }
        promoInput.value = '';
        updateCartUI();
      } else {
        if (promoMsg) {
          promoMsg.textContent = i18n.promoInvalid;
          promoMsg.className = 'cart-promo-msg err';
        }
      }
    }

    if (applyBtn && promoInput) {
      applyBtn.addEventListener('click', handleApplyPromo);
      promoInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleApplyPromo();
        }
      });
    }

    updateCartUI();
  }

  // Mount Sizing Modal
  function mountSizeModal() {
    if (document.getElementById('chiba-size-modal')) return;

    var modal = document.createElement('div');
    modal.id = 'chiba-size-modal';
    modal.className = 'size-modal-backdrop';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
      '<div class="size-modal-card" role="dialog" aria-modal="true" aria-labelledby="size-modal-heading">' +
        '<div class="size-modal-header">' +
          '<h3 id="size-modal-heading">' + i18n.modalTitle + '</h3>' +
          '<button type="button" class="size-modal-close" id="chiba-size-modal-close" aria-label="Close">✕</button>' +
        '</div>' +
        '<div class="size-modal-body">' +
          '<div class="size-formula-box">' +
            '<strong>' + i18n.modalFormula + '</strong>' +
            '<p style="margin: 6px 0 0; font-size: 0.84rem;">' + i18n.modalDesc + '</p>' +
          '</div>' +
          '<table class="size-modal-table">' +
            '<thead>' +
              '<tr><th>' + (isEn ? 'Size' : '手套尺寸') + '</th><th>' + (isEn ? 'German Size (Inch)' : '德國原廠規格 (吋)') + '</th><th>' + (isEn ? 'Palm Circumference' : '參考手掌圍 (公分)') + '</th></tr>' +
            '</thead>' +
            '<tbody>' +
              '<tr data-table-size="XS"><td><strong>XS</strong></td><td>6.0 - 6.5</td><td>16.2 – 17.5 cm</td></tr>' +
              '<tr data-table-size="S"><td><strong>S</strong></td><td>7.0 - 7.5</td><td>17.6 – 19.5 cm</td></tr>' +
              '<tr data-table-size="M"><td><strong>M</strong></td><td>8.0 - 8.5</td><td>19.6 – 22.0 cm</td></tr>' +
              '<tr data-table-size="L"><td><strong>L</strong></td><td>9.0</td><td>22.1 – 24.3 cm</td></tr>' +
              '<tr data-table-size="XL"><td><strong>XL</strong></td><td>9.5 - 10.0</td><td>24.4 – 25.5 cm</td></tr>' +
              '<tr data-table-size="XXL"><td><strong>XXL</strong></td><td>10.5 - 11.0</td><td>25.6 – 27.0 cm</td></tr>' +
              '<tr data-table-size="3XL"><td><strong>3XL</strong></td><td>11.5 - 12.0</td><td>27.1 – 28.5 cm</td></tr>' +
            '</tbody>' +
          '</table>' +
          '<div class="size-calc-tool">' +
            '<label for="size-cm-input">' + i18n.calcPrompt + '</label>' +
            '<div class="size-calc-input-row">' +
              '<input type="number" id="size-cm-input" min="12" max="32" step="0.5" placeholder="例如: 21.5">' +
              '<button type="button" class="button button-primary" id="size-cm-calc-btn">' + i18n.calcBtn + '</button>' +
            '</div>' +
            '<div class="size-calc-result" id="size-cm-result"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    function closeSizeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }

    document.getElementById('chiba-size-modal-close').addEventListener('click', closeSizeModal);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeSizeModal();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeSizeModal();
    });

    // Calculator in modal
    var calcBtn = document.getElementById('size-cm-calc-btn');
    var calcInput = document.getElementById('size-cm-input');
    var calcResult = document.getElementById('size-cm-result');

    function calculateSize() {
      var val = parseFloat(calcInput.value);
      if (!val || val < 12 || val > 32) {
        calcResult.textContent = isEn ? 'Please enter a value between 12 and 32 cm.' : '請輸入 12 至 32 公分之間的掌圍。';
        return;
      }
      var adultSizes = [
        { size: 'XS', cm: 17, min: 0, max: 17.5 },
        { size: 'S', cm: 19, min: 17.6, max: 19.5 },
        { size: 'M', cm: 21, min: 19.6, max: 22.0 },
        { size: 'L', cm: 23.5, min: 22.1, max: 24.3 },
        { size: 'XL', cm: 25, min: 24.4, max: 25.5 },
        { size: 'XXL', cm: 26.5, min: 25.6, max: 27.0 },
        { size: '3XL', cm: 28, min: 27.1, max: 35.0 }
      ];
      var match = adultSizes.find(function(s) { return val >= s.min && val <= s.max; }) || adultSizes[2];
      calcResult.textContent = i18n.recommendedSize(match.size, val);

      // Highlight row in table
      modal.querySelectorAll('tr[data-table-size]').forEach(function(row) {
        row.classList.toggle('highlight-row', row.dataset.tableSize === match.size);
      });
    }

    calcBtn.addEventListener('click', calculateSize);
    calcInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') calculateSize();
    });
  }

  function openSizeModal() {
    var modal = document.getElementById('chiba-size-modal');
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    var input = document.getElementById('size-cm-input');
    if (input) input.focus();
  }

  // Drawer Open/Close Helpers
  function isCartDrawerOpen() {
    var drawer = document.getElementById('chiba-cart-drawer');
    return drawer && drawer.classList.contains('is-open');
  }

  function openCartDrawer() {
    var drawer = document.getElementById('chiba-cart-drawer');
    var overlay = document.getElementById('chiba-cart-overlay');
    if (!drawer || !overlay) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-drawer-open');
    updateCartUI();
  }

  function closeCartDrawer() {
    var drawer = document.getElementById('chiba-cart-drawer');
    var overlay = document.getElementById('chiba-cart-overlay');
    if (!drawer || !overlay) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-drawer-open');
  }

  // Update Drawer UI
  function updateCartUI() {
    var cart = getCart();
    var count = getCartCount();
    var subtotal = getCartSubtotal();

    // 1. Badge count in header
    document.querySelectorAll('[data-cart-count]').forEach(function(el) {
      el.textContent = count;
      el.classList.toggle('has-items', count > 0);
    });

    // 2. Header count in drawer
    var headerCount = document.querySelector('[data-cart-header-count]');
    if (headerCount) {
      headerCount.textContent = count > 0 ? i18n.itemsCount(count) : '';
    }

    // 3. Free Shipping Progress Bar
    var shippingMsg = document.querySelector('[data-shipping-msg]');
    var shippingFill = document.querySelector('[data-shipping-fill]');
    var shippingBar = document.getElementById('chiba-cart-shipping-bar');
    if (shippingMsg && shippingFill && shippingBar) {
      if (subtotal >= FREE_SHIPPING_THRESHOLD) {
        shippingMsg.textContent = i18n.freeShippingUnlocked;
        shippingFill.style.width = '100%';
        shippingBar.classList.add('is-unlocked');
      } else {
        var diff = FREE_SHIPPING_THRESHOLD - subtotal;
        shippingMsg.textContent = i18n.freeShippingAway(diff.toLocaleString());
        var pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
        shippingFill.style.width = pct + '%';
        shippingBar.classList.remove('is-unlocked');
      }
    }

    // 4. Body Content
    var cartBody = document.getElementById('chiba-cart-body');
    var cartFooter = document.getElementById('chiba-cart-footer');
    if (!cartBody || !cartFooter) return;

    if (cart.length === 0) {
      cartBody.innerHTML =
        '<div class="cart-empty-state">' +
          '<div class="cart-empty-icon">🛍️</div>' +
          '<h3>' + i18n.emptyCart + '</h3>' +
          '<p>' + i18n.emptyDesc + '</p>' +
          '<a href="' + (isEn ? '/en/products/' : '/zh-tw/products/') + '" class="button" id="cart-explore-btn">' + i18n.exploreProducts + '</a>' +
        '</div>';
      var expBtn = document.getElementById('cart-explore-btn');
      if (expBtn) expBtn.addEventListener('click', closeCartDrawer);
      cartFooter.style.display = 'none';
      if (shippingBar) shippingBar.style.display = 'none';
    } else {
      cartFooter.style.display = 'flex';
      if (shippingBar) shippingBar.style.display = 'block';

      cartBody.innerHTML = cart.map(function(item) {
        return (
          '<div class="cart-item" data-cart-item-id="' + item.id + '">' +
            '<img src="' + (item.image || '/assets/logo/chiba-icon-redless.jpe') + '" class="cart-item-img" alt="' + item.title + '" loading="lazy">' +
            '<div class="cart-item-info">' +
              '<div class="cart-item-top">' +
                '<h4 class="cart-item-title"><a href="' + item.url + '">' + item.title + '</a></h4>' +
                '<button type="button" class="cart-item-del" data-del-id="' + item.id + '" aria-label="' + i18n.remove + '">✕</button>' +
              '</div>' +
              '<div class="cart-item-meta">' +
                '<span class="cart-meta-pill" style="background:#fef3c7; color:#92400e; font-weight:700;">' + i18n.preorderBadge + '</span>' +
                '<span class="cart-meta-pill">' + item.color + '</span>' +
                '<span class="cart-meta-pill cart-meta-size">' + item.size + '</span>' +
              '</div>' +
              '<div class="cart-item-bottom">' +
                '<div class="cart-qty-stepper">' +
                  '<button type="button" class="cart-qty-btn" data-qty-change="-1" data-id="' + item.id + '">−</button>' +
                  '<span class="cart-qty-val">' + item.qty + '</span>' +
                  '<button type="button" class="cart-qty-btn" data-qty-change="1" data-id="' + item.id + '">+</button>' +
                '</div>' +
                '<strong class="cart-item-price">NT$ ' + (item.price * item.qty).toLocaleString() + '</strong>' +
              '</div>' +
            '</div>' +
          '</div>'
        );
      }).join('');

      // Add click listeners inside body
      cartBody.querySelectorAll('[data-qty-change]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var delta = parseInt(btn.dataset.qtyChange, 10);
          var id = btn.dataset.id;
          updateItemQty(id, delta);
        });
      });
      cartBody.querySelectorAll('[data-del-id]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          removeItem(btn.dataset.delId);
        });
      });
    }

    // 5. Footer Summary & Promo Calculation
    var promos = getAppliedPromos();
    var promoRes = calculatePromoDiscounts(subtotal, promos);
    var discount = promoRes.totalDiscount;

    var promoForm = document.getElementById('cart-promo-form');
    var promoApplied = document.getElementById('cart-promo-applied');
    var promoTags = document.getElementById('cart-promo-tags');
    var promoStackBox = document.getElementById('cart-promo-stack-box');
    var discountRow = document.getElementById('cart-discount-row');
    var discountLabel = document.getElementById('cart-discount-label');
    var discountAmount = document.getElementById('cart-discount-amount');
    var discountBreakdown = document.getElementById('cart-discount-breakdown');

    var hasP90 = promos.some(function(p) { return p.code === 'PREORDER90'; });
    var hasC100 = promos.some(function(p) { return p.code === 'CHIBA100'; });

    if (promos.length > 0 && discount > 0) {
      if (promoApplied) {
        promoApplied.style.display = 'flex';
      }
      if (promoTags) {
        promoTags.innerHTML = promoRes.details.map(function(item) {
          return (
            '<div class="cart-promo-tag-item">' +
              '<span>🏷️ <strong>' + item.code + '</strong> <span style="font-size:0.75rem;">(' + item.label + ' -NT$ ' + item.discount.toLocaleString() + ')</span></span>' +
              '<button type="button" class="tag-del" data-del-promo="' + item.code + '" aria-label="' + i18n.removePromo + '">✕</button>' +
            '</div>'
          );
        }).join('');

        promoTags.querySelectorAll('[data-del-promo]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            removeAppliedPromo(btn.dataset.delPromo);
            var promoMsg = document.getElementById('cart-promo-msg');
            if (promoMsg) promoMsg.textContent = '';
            updateCartUI();
          });
        });
      }

      if (promoForm) {
        promoForm.style.display = (hasP90 && hasC100) ? 'none' : 'flex';
      }

      if (discountRow) {
        discountRow.style.display = 'flex';
        if (discountLabel) {
          discountLabel.textContent = i18n.promoDiscount + ' (' + promos.map(function(p) { return p.code; }).join(' + ') + ')';
        }
        if (discountAmount) {
          discountAmount.textContent = '-NT$ ' + discount.toLocaleString();
        }
      }

      if (discountBreakdown) {
        if (promoRes.details.length > 1) {
          discountBreakdown.innerHTML = promoRes.details.map(function(item) {
            return (
              '<div class="cart-discount-detail">' +
                '<span>• ' + item.label + '</span>' +
                '<span>-NT$ ' + item.discount.toLocaleString() + '</span>' +
              '</div>'
            );
          }).join('');
          discountBreakdown.style.display = 'block';
        } else {
          discountBreakdown.innerHTML = '';
          discountBreakdown.style.display = 'none';
        }
      }
    } else {
      if (promoApplied) promoApplied.style.display = 'none';
      if (promoTags) promoTags.innerHTML = '';
      if (promoForm) promoForm.style.display = 'flex';
      if (discountRow) discountRow.style.display = 'none';
      if (discountBreakdown) discountBreakdown.style.display = 'none';
    }

    // Stacking Recommendation Box
    if (promoStackBox) {
      if (hasP90 && hasC100) {
        promoStackBox.style.display = 'flex';
        promoStackBox.innerHTML = '<span>' + i18n.promoStackApplied + '</span>';
      } else if (hasP90 && !hasC100) {
        promoStackBox.style.display = 'flex';
        promoStackBox.innerHTML =
          '<span>' + i18n.promoStackPromptC100 + '</span>' +
          '<button type="button" class="cart-promo-stack-btn" id="btn-stack-c100">' + i18n.promoStackBtnC100 + '</button>';
        var btnC = promoStackBox.querySelector('#btn-stack-c100');
        if (btnC) {
          btnC.addEventListener('click', function() {
            addAppliedPromo('CHIBA100');
            updateCartUI();
          });
        }
      } else if (!hasP90 && hasC100) {
        promoStackBox.style.display = 'flex';
        promoStackBox.innerHTML =
          '<span>' + i18n.promoStackPromptP90 + '</span>' +
          '<button type="button" class="cart-promo-stack-btn" id="btn-stack-p90">' + i18n.promoStackBtnP90 + '</button>';
        var btnP = promoStackBox.querySelector('#btn-stack-p90');
        if (btnP) {
          btnP.addEventListener('click', function() {
            addAppliedPromo('PREORDER90');
            updateCartUI();
          });
        }
      } else {
        promoStackBox.style.display = 'flex';
        promoStackBox.innerHTML =
          '<span>' + i18n.promoStackPromptBoth + '</span>' +
          '<button type="button" class="cart-promo-stack-btn" id="btn-stack-both">' + i18n.promoStackBtnBoth + '</button>';
        var btnB = promoStackBox.querySelector('#btn-stack-both');
        if (btnB) {
          btnB.addEventListener('click', function() {
            addAppliedPromo('PREORDER90');
            addAppliedPromo('CHIBA100');
            updateCartUI();
          });
        }
      }
    }

    var subtotalEl = document.querySelector('[data-cart-subtotal]');
    var shippingEl = document.querySelector('[data-cart-shipping]');
    var totalEl = document.querySelector('[data-cart-total]');
    if (subtotalEl && shippingEl && totalEl) {
      subtotalEl.textContent = 'NT$ ' + subtotal.toLocaleString();
      var shippingFee = (subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0) ? 0 : CVS_SHIPPING_FEE;
      shippingEl.textContent = shippingFee === 0 ? i18n.freeShipping : 'NT$ ' + shippingFee;
      var finalPayable = Math.max(0, subtotal - discount) + shippingFee;
      totalEl.textContent = 'NT$ ' + finalPayable.toLocaleString();
    }

    var cartCheckoutBtn = document.getElementById('chiba-cart-checkout-btn');
    if (cartCheckoutBtn) {
      var shopifyCfg = getShopifyConfig();
      cartCheckoutBtn.textContent = (shopifyCfg.mode !== 'native') ? i18n.shopifyCheckout : i18n.checkout;
    }

    // 6. Pre-fill LINE consultation button in cart
    var lineBtn = document.querySelector('[data-cart-line-btn]');
    if (lineBtn) {
      if (cart.length > 0) {
        var cartSummary = cart.map(function(item) {
          return '• [預購] ' + item.title + ' (' + item.color + ' / ' + item.size + ') x' + item.qty + ' = NT$' + (item.price * item.qty);
        }).join('%0A');
        var promoNote = (promos.length > 0 && discount > 0)
          ? '%0A• 促銷折扣：' + promos.map(function(p) { return p.code; }).join(' + ') + ' (-NT$ ' + discount.toLocaleString() + ')'
          : '';
        var payableAmt = Math.max(0, subtotal - discount) + (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : CVS_SHIPPING_FEE);
        var lineText = encodeURIComponent('您好！我想諮詢/購買以下德國預購手套：\n') + cartSummary + promoNote + encodeURIComponent('\n應付總金額：NT$ ' + payableAmt.toLocaleString());
        lineBtn.href = LINE_BASE_URL + '?text=' + lineText;
      } else {
        lineBtn.href = LINE_BASE_URL;
      }
    }
  }

  // 6. Product Page E-Commerce Section (Size Selector + Dual Conversion Actions)
  function initProductPageEcommerce() {
    var productSection = document.querySelector('[data-variant-product]');
    if (!productSection) return;

    var detailEl = productSection.querySelector('.detail');
    if (!detailEl) return;

    var isZh = !isEn;

    var skuEl = detailEl.querySelector('.sku');
    var sku = skuEl ? skuEl.textContent.replace('SKU', '').trim() : '';
    var titleEl = detailEl.querySelector('h1');
    var title = titleEl ? titleEl.textContent.trim() : '';

    var priceEl = detailEl.querySelector('[data-variant-price]');

    var getPrice = function() {
      if (!priceEl) return 0;
      var m = priceEl.textContent.replace(/,/g, '').match(/\d+(\.\d+)?/);
      return m ? Math.round(parseFloat(m[0])) : 0;
    };

    var variantColourEl = detailEl.querySelector('[data-variant-colour]');
    var variantSizesEl = detailEl.querySelector('[data-variant-sizes]');
    var galleryImgEl = productSection.querySelector('.gallery img');

    // Parse available sizes
    var rawSizeStr = variantSizesEl ? variantSizesEl.textContent : 'M';
    var parsedSizes = parseSizes(rawSizeStr, sku);
    var selectedSize = parsedSizes[0] || 'M';
    var selectedQty = 1;

    // 1. Create Size Picker Section (Clean Sizing List + Modal Guide Trigger)
    var sizePickerSection = document.createElement('section');
    sizePickerSection.className = 'size-picker-section';
    sizePickerSection.innerHTML =
      '<div class="size-picker-header">' +
        '<h2>' + i18n.selectSize + '</h2>' +
        '<button type="button" class="btn-size-modal-trigger" id="chiba-open-size-modal">' +
          i18n.sizeGuideTitle +
        '</button>' +
      '</div>' +
      '<div class="size-options" data-size-selector>' +
        parsedSizes.map(function(sz, idx) {
          return (
            '<button type="button" class="size-option ' + (idx === 0 ? 'active' : '') + '" data-size-val="' + sz + '" aria-pressed="' + (idx === 0 ? 'true' : 'false') + '">' +
              sz +
            '</button>'
          );
        }).join('') +
      '</div>';

    // Hook up size modal trigger
    var modalTrigger = sizePickerSection.querySelector('#chiba-open-size-modal');
    if (modalTrigger) {
      modalTrigger.addEventListener('click', openSizeModal);
    }

    // Size Selection Handler
    sizePickerSection.querySelectorAll('[data-size-val]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        sizePickerSection.querySelectorAll('[data-size-val]').forEach(function(b) {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        selectedSize = btn.dataset.sizeVal;
      });
    });

    // Insert size picker before or after variant-picker
    var variantPicker = detailEl.querySelector('.variant-picker');
    if (variantPicker) {
      variantPicker.parentNode.insertBefore(sizePickerSection, variantPicker.nextSibling);
    } else {
      detailEl.appendChild(sizePickerSection);
    }

    // 2. Build Single Official Buy Now Action Container
    var actionWrap = document.createElement('div');
    actionWrap.className = 'product-ecommerce-actions';
    actionWrap.innerHTML =
      '<div class="product-buy-row product-buy-row--single">' +
        '<button type="button" class="btn-buy-now btn-buy-now--primary" id="prod-buy-now">' +
          i18n.shopifyBuyNow +
        '</button>' +
      '</div>';

    // Buy Now Handler (Direct handover to Shopify Product Page)
    actionWrap.querySelector('#prod-buy-now').addEventListener('click', function() {
      var shopifyCfg = getShopifyConfig();
      var category = (window.location.pathname.indexOf('cycling') !== -1) ? 'cycling' : 'fitness';
      var handle = 'chiba-' + sku + '-' + category;
      window.location.href = shopifyCfg.baseUrl + '/products/' + encodeURIComponent(handle);
    });

    // Replace order-contact button with ecommerce actions + B2B inquiry link
    var oldOrderBtn = detailEl.querySelector('.order-contact');
    if (oldOrderBtn) {
      oldOrderBtn.parentNode.insertBefore(actionWrap, oldOrderBtn);
      oldOrderBtn.className = 'b2b-inquiry-pill';
      oldOrderBtn.textContent = '📋 ' + i18n.inquireB2B;
    } else {
      detailEl.appendChild(actionWrap);
    }
  }

  // 8. Initialize Everything when DOM is Ready
  function init() {
    mountHeaderStoreButton();
    mountSizeModal();
    initProductPageEcommerce();
  }

  window.ChibaEcommerce = {
    getMember: getLoggedInMember,
    setMember: setLoggedInMember,
    logout: logoutMember,
    getAllMembers: getAllMembers,
    checkFirstTime: checkFirstTimePurchaseEligibility,
    openMemberModal: openMemberModal,
    openCart: openCartDrawer
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

