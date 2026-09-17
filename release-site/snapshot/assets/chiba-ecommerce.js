// ==========================================================================
// CHIBA Taiwan - Pluggable E-Commerce Module (Option B)
// Decoupled, Zero-Pollution Add-on with 1-Second Master Kill-Switch
// ==========================================================================
(function() {
  'use strict';

  // 1. Master Kill-Switch Check
  window.CHIBA_CONFIG = window.CHIBA_CONFIG || {};
  if (window.CHIBA_CONFIG.enableEcommerce === undefined) {
    window.CHIBA_CONFIG.enableEcommerce = true;
  }
  if (!window.CHIBA_CONFIG.enableEcommerce) {
    return; // E-commerce disabled; pure static catalog mode
  }

  // 2. Constants & Storage Configuration
  var CART_STORAGE_KEY = 'chiba_cart_v1';
  var FREE_SHIPPING_THRESHOLD = 1500;
  var CVS_SHIPPING_FEE = 65;
  var isEn = document.documentElement.lang.startsWith('en');

  var LINE_BASE_URL = window.CHIBA_CONFIG.lineUrl || 'https://line.me/R/ti/p/@chibataiwan';

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
    estimatedShipping: isEn ? 'Estimated Shipping' : '預估運費 (超商取貨)',
    freeShipping: isEn ? 'FREE' : '免運費',
    total: isEn ? 'Total' : '含稅總計',
    checkout: isEn ? 'Proceed to Checkout →' : '前往結帳 →',
    lineCheckout: isEn ? 'Quick Order via LINE' : '🟢 LINE 專人快速諮詢 / 訂購',
    addToCart: isEn ? 'Add to Cart' : '加入購物車',
    buyNow: isEn ? 'Buy Now' : '⚡ 立即結帳',
    selectSize: isEn ? 'Select Size' : '選擇尺寸',
    sizeGuideTitle: isEn ? 'German Sizing & Measurement Guide' : '📏 尺寸對照與德國吋測量指南',
    modalTitle: isEn ? 'German Glove Sizing Guide (Altdeutsche Zoll)' : '德國百年手套吋（Altdeutsche Zoll）尺寸指南',
    modalFormula: isEn ? '1 German Inch = 2.7 cm Hand Circumference' : '傳統德國手套吋標準：1 德國吋 = 2.7 公分 掌圍',
    modalDesc: isEn
      ? 'European sports gloves measure palm circumference in traditional German inches (Altdeutsche Zoll). Use a flexible measuring tape around the widest part of your hand (excluding thumb) to determine your ideal size.'
      : '歐洲專業機能手套採用傳統「德國手套吋」計算。請使用布尺環繞手掌最寬處（虎口上方、不含大拇指）測量掌圍公分，即可精確換算合適尺寸：',
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
    if (existing) {
      existing.qty = (existing.qty || 1) + (item.qty || 1);
    } else {
      cart.push(item);
    }
    saveCart(cart);
    openCartDrawer();
  }

  function updateItemQty(id, delta) {
    var cart = getCart();
    var item = cart.find(function(i) { return i.id === id; });
    if (!item) return;
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

  // Helper: Parse sizes from string (e.g. "XS, S, M, L, XL, XXL, 3XL", "XS-4XL", "Onesize")
  function parseSizes(str) {
    if (!str) return ['M'];
    str = str.trim();
    if (str.indexOf(',') !== -1) {
      return str.split(',').map(function(s) {
        return s.trim().replace(/^[^:]+:\s*/, '');
      }).filter(Boolean);
    }
    if (str.toLowerCase() === 'onesize') {
      return [isEn ? 'One Size' : '單一尺寸'];
    }
    if (str === 'XS-4XL') {
      return ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
    }
    if (str === 'S-4XL') {
      return ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
    }
    return [str];
  }

  // 5. Build & Mount UI Elements

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
      '<svg class="cart-icon" viewBox="0 0 24 24" width="22" height="22">' +
        '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>' +
        '<line x1="3" y1="6" x2="21" y2="6"></line>' +
        '<path d="M16 10a4 4 0 0 1-8 0"></path>' +
      '</svg>' +
      '<span class="cart-badge" data-cart-count>0</span>';

    cartBtn.addEventListener('click', openCartDrawer);

    // Insert right before hamburger menu button
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
            '<svg class="cart-title-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">' +
              '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>' +
              '<line x1="3" y1="6" x2="21" y2="6"></line>' +
              '<path d="M16 10a4 4 0 0 1-8 0"></path>' +
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
          '<div class="cart-summary-row">' +
            '<span>' + i18n.subtotal + '</span>' +
            '<strong data-cart-subtotal>NT$ 0</strong>' +
          '</div>' +
          '<div class="cart-summary-row">' +
            '<span>' + i18n.estimatedShipping + '</span>' +
            '<span data-cart-shipping>' + i18n.freeShipping + '</span>' +
          '</div>' +
          '<div class="cart-summary-row cart-total-row">' +
            '<span>' + i18n.total + '</span>' +
            '<strong class="cart-total-price" data-cart-total>NT$ 0</strong>' +
          '</div>' +
          '<a href="' + (isEn ? '/en/checkout/' : '/zh-tw/checkout/') + '" class="cart-checkout-btn">' + i18n.checkout + '</a>' +
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
              '<tr><th>' + (isEn ? 'Size' : '尺寸') + '</th><th>' + (isEn ? 'German Inch' : '德國手套吋') + '</th><th>' + (isEn ? 'Palm Circumference' : '參考手掌圍') + '</th></tr>' +
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

    // 5. Footer Summary
    var subtotalEl = document.querySelector('[data-cart-subtotal]');
    var shippingEl = document.querySelector('[data-cart-shipping]');
    var totalEl = document.querySelector('[data-cart-total]');
    if (subtotalEl && shippingEl && totalEl) {
      subtotalEl.textContent = 'NT$ ' + subtotal.toLocaleString();
      var shippingFee = (subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0) ? 0 : CVS_SHIPPING_FEE;
      shippingEl.textContent = shippingFee === 0 ? i18n.freeShipping : 'NT$ ' + shippingFee;
      totalEl.textContent = 'NT$ ' + (subtotal + shippingFee).toLocaleString();
    }

    // 6. Pre-fill LINE consultation button in cart
    var lineBtn = document.querySelector('[data-cart-line-btn]');
    if (lineBtn) {
      if (cart.length > 0) {
        var cartSummary = cart.map(function(item) {
          return '• ' + item.title + ' (' + item.color + ' / ' + item.size + ') x' + item.qty + ' = NT$' + (item.price * item.qty);
        }).join('%0A');
        var lineText = encodeURIComponent('您好！我想諮詢/購買以下購物車商品：\n') + cartSummary + encodeURIComponent('\n總金額：NT$ ' + (subtotal + (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : CVS_SHIPPING_FEE)));
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
    var parsedSizes = parseSizes(rawSizeStr);
    var selectedSize = parsedSizes[0] || 'M';
    var selectedQty = 1;

    // 1. Create Size Picker Section
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
        updateLineOrderLink();
      });
    });

    // Insert size picker before or after variant-picker
    var variantPicker = detailEl.querySelector('.variant-picker');
    if (variantPicker) {
      variantPicker.parentNode.insertBefore(sizePickerSection, variantPicker.nextSibling);
    } else {
      detailEl.appendChild(sizePickerSection);
    }

    // 2. Build Product Dual-Action Container
    var actionWrap = document.createElement('div');
    actionWrap.className = 'product-ecommerce-actions';
    actionWrap.innerHTML =
      '<div class="product-buy-row">' +
        '<div class="product-qty-stepper">' +
          '<button type="button" class="product-qty-btn" id="prod-qty-minus">−</button>' +
          '<span class="product-qty-val" id="prod-qty-val">1</span>' +
          '<button type="button" class="product-qty-btn" id="prod-qty-plus">+</button>' +
        '</div>' +
        '<button type="button" class="btn-add-cart" id="prod-add-cart">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>' +
            '<line x1="3" y1="6" x2="21" y2="6"></line>' +
            '<path d="M16 10a4 4 0 0 1-8 0"></path>' +
          '</svg>' +
          i18n.addToCart +
        '</button>' +
        '<button type="button" class="btn-buy-now" id="prod-buy-now">' +
          i18n.buyNow +
        '</button>' +
      '</div>' +
      '<a href="#" target="_blank" rel="noopener noreferrer" class="btn-line-direct" id="prod-line-order">' +
        '<svg class="cart-line-icon" viewBox="0 0 24 24"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>' +
        i18n.lineCheckout +
      '</a>';

    // Quantity Stepper Handlers
    var qtyValEl = actionWrap.querySelector('#prod-qty-val');
    actionWrap.querySelector('#prod-qty-minus').addEventListener('click', function() {
      if (selectedQty > 1) {
        selectedQty--;
        qtyValEl.textContent = selectedQty;
      }
    });
    actionWrap.querySelector('#prod-qty-plus').addEventListener('click', function() {
      if (selectedQty < 99) {
        selectedQty++;
        qtyValEl.textContent = selectedQty;
      }
    });

    // Helper: Build Cart Item Object
    function createCartItem() {
      var activeColor = variantColourEl ? variantColourEl.textContent.trim() : 'Standard';
      var activePrice = getPrice();
      var activeImg = galleryImgEl ? galleryImgEl.src : '';
      return {
        id: (sku + '-' + activeColor + '-' + selectedSize).replace(/\s+/g, '-').toLowerCase(),
        sku: sku,
        title: title,
        color: activeColor,
        size: selectedSize,
        price: activePrice,
        image: activeImg,
        qty: selectedQty,
        url: window.location.pathname
      };
    }

    // Helper: Update LINE Direct Order link
    function updateLineOrderLink() {
      var lineBtn = actionWrap.querySelector('#prod-line-order');
      if (!lineBtn) return;
      var activeColor = variantColourEl ? variantColourEl.textContent.trim() : 'Standard';
      var activePrice = getPrice();
      var msg = isEn
        ? 'Hello! I would like to inquire/order CHIBA gloves:\n• Product: ' + title + ' (SKU ' + sku + ')\n• Color: ' + activeColor + '\n• Size: ' + selectedSize + '\n• Price: NT$ ' + activePrice + '\n• URL: ' + window.location.href
        : '您好！我想諮詢/購買 CHIBA 德國機能手套：\n• 商品：' + title + ' (型號 ' + sku + ')\n• 顏色：' + activeColor + '\n• 尺寸：' + selectedSize + '\n• 建議售價：NT$ ' + activePrice + '\n• 商品網址：' + window.location.href;
      lineBtn.href = LINE_BASE_URL + '?text=' + encodeURIComponent(msg);
    }

    // Listen for variant color changes to update line link
    detailEl.querySelectorAll('[data-variant-key]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        setTimeout(updateLineOrderLink, 50);
      });
    });
    updateLineOrderLink();

    // Add to Cart Handler
    actionWrap.querySelector('#prod-add-cart').addEventListener('click', function() {
      var item = createCartItem();
      addToCart(item);
    });

    // Buy Now Handler
    actionWrap.querySelector('#prod-buy-now').addEventListener('click', function() {
      var item = createCartItem();
      addToCart(item);
      window.location.href = isEn ? '/en/checkout/' : '/zh-tw/checkout/';
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

  // 7. Initialize Everything when DOM is Ready
  function init() {
    mountHeaderCartButton();
    mountCartDrawer();
    mountSizeModal();
    initProductPageEcommerce();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
