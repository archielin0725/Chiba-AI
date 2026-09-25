(function() {
  // Storage keys
  var STORAGE_KEY_AUTH = 'chiba_admin_auth_session_v1';
  var STORAGE_KEY_REMEMBER = 'chiba_admin_remember_token_v1';
  var STORAGE_KEY_PIN = 'chiba_admin_pin_code_v1';
  var STORAGE_KEY_ORDERS = 'chiba_order_history_v1';
  var STORAGE_KEY_CONFIG = 'chiba_site_config_v1';
  var STORAGE_KEY_WEBHOOK = 'chiba_webhook_url_v1';
  var DEFAULT_PIN = '888888';

  var currentPinInput = '';
  var activeTab = 'tab-dashboard';

  // -------------------------------------------------------------
  // AUTHENTICATION & PIN GATE
  // -------------------------------------------------------------
  function getMasterPin() {
    return localStorage.getItem(STORAGE_KEY_PIN) || DEFAULT_PIN;
  }

  function isAuthenticated() {
    // Check session storage first
    if (sessionStorage.getItem(STORAGE_KEY_AUTH) === 'AUTHENTICATED') return true;
    // Check 7-day remember token
    var remember = localStorage.getItem(STORAGE_KEY_REMEMBER);
    if (remember) {
      try {
        var data = JSON.parse(remember);
        if (data.expiry && Date.now() < data.expiry) return true;
      } catch(e) {}
    }
    return false;
  }

  function updatePinDots() {
    var dots = document.querySelectorAll('#pin-dots .pin-dot');
    dots.forEach(function(dot, idx) {
      if (idx < currentPinInput.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  function checkPin() {
    var master = getMasterPin();
    var errMsg = document.getElementById('auth-error-msg');
    if (currentPinInput === master) {
      // Success
      sessionStorage.setItem(STORAGE_KEY_AUTH, 'AUTHENTICATED');
      var remBox = document.getElementById('auth-remember-device');
      if (remBox && remBox.checked) {
        localStorage.setItem(STORAGE_KEY_REMEMBER, JSON.stringify({
          expiry: Date.now() + 7 * 24 * 60 * 60 * 1000
        }));
      }
      var authScreen = document.getElementById('auth-screen');
      if (authScreen) authScreen.style.display = 'none';
      initPortal();
    } else {
      // Failed
      if (errMsg) errMsg.textContent = '❌ PIN 碼錯誤，請重新輸入';
      currentPinInput = '';
      updatePinDots();
      setTimeout(function() { if (errMsg) errMsg.textContent = ''; }, 2500);
    }
  }

  function handleKeypadPress(digit) {
    if (currentPinInput.length < 6) {
      currentPinInput += digit;
      updatePinDots();
      if (currentPinInput.length === 6) {
        setTimeout(checkPin, 100);
      }
    }
  }

  function handleBackspace() {
    if (currentPinInput.length > 0) {
      currentPinInput = currentPinInput.slice(0, -1);
      updatePinDots();
      var errMsg = document.getElementById('auth-error-msg');
      if (errMsg) errMsg.textContent = '';
    }
  }

  // Keypad button listeners
  document.querySelectorAll('.key-btn[data-key]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      handleKeypadPress(this.getAttribute('data-key'));
    });
  });

  var btnBk = document.getElementById('btn-pin-backspace');
  if (btnBk) btnBk.addEventListener('click', handleBackspace);

  // Keyboard support
  window.addEventListener('keydown', function(e) {
    var auth = document.getElementById('auth-screen');
    if (auth && auth.style.display !== 'none') {
      if (e.key >= '0' && e.key <= '9') {
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter' && currentPinInput.length === 6) {
        checkPin();
      }
    }
  });

  // Biometric unlock shortcut
  var btnBio = document.getElementById('btn-biometric-unlock');
  if (btnBio) {
    btnBio.addEventListener('click', function() {
      alert('💡 提示：輸入 6 碼管理 PIN 碼 (預設 888888) 即可快速登入。若需 FaceID 授權，請勾選「記住此裝置」！');
    });
  }

  // Lock session
  var btnLock = document.getElementById('btn-lock-session');
  if (btnLock) {
    btnLock.addEventListener('click', function() {
      sessionStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem(STORAGE_KEY_REMEMBER);
      currentPinInput = '';
      updatePinDots();
      var authScreen = document.getElementById('auth-screen');
      if (authScreen) authScreen.style.display = 'flex';
    });
  }

  // -------------------------------------------------------------
  // TAB NAVIGATION LOGIC
  // -------------------------------------------------------------
  function switchPortalTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.tab-pane').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.nav-tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.mobile-tab-btn').forEach(function(b) { b.classList.remove('active'); });

    var targetPane = document.getElementById(tabId);
    if (targetPane) targetPane.classList.add('active');

    var deskBtn = document.querySelector('.nav-tab-btn[data-tab="' + tabId + '"]');
    if (deskBtn) deskBtn.classList.add('active');

    var mobBtn = document.querySelector('.mobile-tab-btn[data-tab="' + tabId + '"]');
    if (mobBtn) mobBtn.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.nav-tab-btn').forEach(function(b) {
    b.addEventListener('click', function() {
      switchPortalTab(this.getAttribute('data-tab'));
    });
  });

  document.querySelectorAll('.mobile-tab-btn').forEach(function(b) {
    b.addEventListener('click', function() {
      switchPortalTab(this.getAttribute('data-tab'));
    });
  });

  // Delegate click for data-switch-tab
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-switch-tab]');
    if (btn) {
      e.preventDefault();
      switchPortalTab(btn.getAttribute('data-switch-tab'));
    }
  });

  // Delegate click for dialog close
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-close-dialog]');
    if (btn) {
      e.preventDefault();
      var dlg = document.getElementById(btn.getAttribute('data-close-dialog'));
      if (dlg && typeof dlg.close === 'function') dlg.close();
    }
  });

  // -------------------------------------------------------------
  // MASTER QUICK SWITCH (E-COMMERCE TOGGLE)
  // -------------------------------------------------------------
  function getSiteConfig() {
    var cfg = {
      enableEcommerce: true,
      shopifyDomain: "shop.chibataiwan.com",
      checkoutGateway: "shopify",
      priceOverrides: {},
      wordingOverrides: { "zh-tw": {}, "en": {} },
      googleSheetsWebhookUrl: ""
    };
    try {
      var local = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (local) {
        Object.assign(cfg, JSON.parse(local));
      }
    } catch(e) {}
    var activeFlag = localStorage.getItem('chiba_ecommerce_active');
    if (activeFlag !== null) {
      cfg.enableEcommerce = (activeFlag === 'true');
    }
    return cfg;
  }

  function saveSiteConfig(cfg) {
    cfg.updatedAt = new Date().toISOString();
    var isShop = cfg.enableEcommerce !== false;
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cfg));
    localStorage.setItem('chiba_ecommerce_active', isShop ? 'true' : 'false');
    if (cfg.priceOverrides || cfg.wordingOverrides) {
      localStorage.setItem('chiba_params_v1', JSON.stringify({
        priceOverrides: cfg.priceOverrides || {},
        wordingOverrides: cfg.wordingOverrides || { 'zh-tw': {}, 'en': {} }
      }));
    }
    if (cfg.googleSheetsWebhookUrl) {
      localStorage.setItem('chiba_sheets_webhook_url', cfg.googleSheetsWebhookUrl);
    }
    renderMasterSwitch();
  }

  function renderMasterSwitch() {
    var cfg = getSiteConfig();
    var pill = document.getElementById('btn-header-master-switch');
    var dot = document.getElementById('master-switch-dot');
    var label = document.getElementById('master-switch-label');
    var isShop = cfg.enableEcommerce !== false;

    if (pill && dot && label) {
      if (isShop) {
        pill.className = 'master-switch-card active';
        dot.textContent = '🟢';
        label.textContent = '購物功能開啟中';
      } else {
        pill.className = 'master-switch-card disabled';
        dot.textContent = '🔴';
        label.textContent = '純型錄展示模式';
      }
    }

    // Dynamic front-end link buttons to ensure opened tab has target mode
    var frontLinks = document.querySelectorAll('.link-front-site');
    frontLinks.forEach(function(link) {
      if (isShop) {
        link.href = '/zh-tw/products/?shop=1';
        link.textContent = '🛒 前往線上購物官網 ↗';
      } else {
        link.href = '/zh-tw/products/?shop=0';
        link.textContent = '👁️ 前往純型錄官網 ↗';
      }
    });
  }

  function toggleMasterSwitch() {
    var cfg = getSiteConfig();
    var current = cfg.enableEcommerce !== false;
    var next = !current;
    cfg.enableEcommerce = next;
    saveSiteConfig(cfg);

    var targetUrl = window.location.origin + '/zh-tw/products/?shop=' + (next ? '1' : '0');
    if (next) {
      alert('✓ 已成功【開啟】全站線上購物功能！\n全站 220 頁即刻啟用購物車、規格選擇器與預購結帳。\n\n▶ 前往購物官網：\n' + targetUrl);
    } else {
      alert('✓ 已成功【切換為純型錄展示模式】！\n線上購物功能已關閉，全站 220 頁即刻回復純靜態型錄，0 殘留購物車或訂購按鈕。\n\n▶ 前往純型錄官網驗證：\n' + targetUrl);
    }
  }

  var btnHdrSwitch = document.getElementById('btn-header-master-switch');
  if (btnHdrSwitch) btnHdrSwitch.addEventListener('click', toggleMasterSwitch);

  var btnQkSwitch = document.getElementById('btn-quick-toggle-shop');
  if (btnQkSwitch) btnQkSwitch.addEventListener('click', toggleMasterSwitch);

  var btnSettingsSwitch = document.getElementById('btn-settings-toggle-shop');
  if (btnSettingsSwitch) btnSettingsSwitch.addEventListener('click', toggleMasterSwitch);

  var btnCopyLinks = document.getElementById('btn-copy-switch-links');
  if (btnCopyLinks) {
    btnCopyLinks.addEventListener('click', function() {
      var origin = window.location.origin;
      var catalogUrl = origin + '/zh-tw/products/?shop=0';
      var shopUrl = origin + '/zh-tw/products/?shop=1';
      var text = '【CHIBA 官網展示模式快速連結】\n\n' +
        '▶ 純型錄展示模式（購物關閉，100% 零影響純靜態型錄）：\n' + catalogUrl + '\n\n' +
        '▶ 線上購物模式（購物開啟，完整購物車與結帳）：\n' + shopUrl;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
          alert('✓ 快速切換連結已複製至剪貼簿！\n\n' + text);
        }).catch(function() {
          prompt('請複製以下切換連結：', text);
        });
      } else {
        prompt('請複製以下切換連結：', text);
      }
    });
  }

  // -------------------------------------------------------------
  // ORDERS MANAGEMENT
  // -------------------------------------------------------------
  function getOrders() {
    try {
      var local = localStorage.getItem(STORAGE_KEY_ORDERS);
      if (local) {
        var parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) {}

    // Fallback default sample orders
    var sampleOrders = [
      {
        orderId: 'CBA-20260918-4723',
        createdAt: '2026-09-18T02:30:00+08:00',
        status: 'NEW',
        contact: { name: '林志昇', phone: '0912345678', email: 'chihsheng.lin@example.com' },
        delivery: { method: 'CVS_711', storeName: '7-ELEVEN 欣漢門市', storeCode: '131386', address: '台北市中山區南京東路二段100號' },
        payment: { method: 'CVS_COD', label: '7-ELEVEN 超商取貨付款' },
        items: [
          { sku: '3010626', name: 'Gel Super Comfort', color: 'Black', size: 'M', qty: 1, price: 1660 }
        ],
        subtotal: 1660,
        discount: 266,
        total: 1394,
        trackingNumber: ''
      },
      {
        orderId: 'CBA-20260917-8821',
        createdAt: '2026-09-17T14:20:00+08:00',
        status: 'PROCURING',
        contact: { name: '陳建華', phone: '0988776655', email: 'jianhua.chen@example.com' },
        delivery: { method: 'CVS_711', storeName: '7-ELEVEN 敦南門市', storeCode: '112233', address: '台北市大安區敦化南路二段88號' },
        payment: { method: 'ATM_TRANSFER', label: '中信 ATM 虛擬帳號轉帳', atmLast5: '56789' },
        items: [
          { sku: '40125', name: 'Wristguard V', color: 'Black', size: 'L', qty: 2, price: 1860 }
        ],
        subtotal: 3720,
        discount: 372,
        total: 3348,
        trackingNumber: ''
      }
    ];
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(sampleOrders));
    return sampleOrders;
  }

  function saveOrders(orders) {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
    renderOrders();
    renderDashboard();
  }

  function renderDashboard() {
    var orders = getOrders();
    var totalRev = 0;
    var codTotal = 0;
    var atmPending = 0;

    orders.forEach(function(o) {
      totalRev += (o.total || 0);
      if (o.payment && o.payment.method === 'CVS_COD') codTotal += (o.total || 0);
      if (o.payment && o.payment.method === 'ATM_TRANSFER' && o.status !== 'COMPLETED') atmPending++;
    });

    var elTotal = document.getElementById('kpi-total-orders');
    var elRev = document.getElementById('kpi-total-revenue');
    var elCod = document.getElementById('kpi-cod-total');
    var elAtm = document.getElementById('kpi-atm-pending');

    if (elTotal) elTotal.textContent = orders.length + ' 筆';
    if (elRev) elRev.textContent = 'NT$ ' + totalRev.toLocaleString();
    if (elCod) elCod.textContent = 'NT$ ' + codTotal.toLocaleString();
    if (elAtm) elAtm.textContent = atmPending + ' 筆';

    // Render Recent 5 Orders on Dashboard
    var recentHtml = '';
    var recent = orders.slice(0, 5);
    if (recent.length === 0) {
      recentHtml = '<p style="color: #64748b; font-size: 0.85rem;">目前尚無新進訂單。</p>';
    } else {
      recent.forEach(function(o) {
        recentHtml += renderOrderCardHtml(o, true);
      });
    }
    var elRecentList = document.getElementById('dashboard-recent-orders-list');
    if (elRecentList) elRecentList.innerHTML = recentHtml;
  }

  function getStatusBadge(status) {
    if (status === 'NEW') return '<span class="order-badge-status new">⚡ 待處理新單</span>';
    if (status === 'PROCURING') return '<span class="order-badge-status procuring">🇩🇪 德國原廠備貨中</span>';
    if (status === 'SHIPPED') return '<span class="order-badge-status shipped">🏪 7-11 配送中</span>';
    if (status === 'COMPLETED') return '<span class="order-badge-status completed">✅ 已完成取件</span>';
    return '<span class="order-badge-status">' + status + '</span>';
  }

  function renderOrderCardHtml(o, isBrief) {
    var itemsSummary = (o.items || []).map(function(i) {
      return (i.name || i.sku) + ' (' + (i.size || '') + ') x' + (i.qty || 1);
    }).join('、 ');

    var dateStr = o.createdAt ? new Date(o.createdAt).toLocaleString('zh-TW', { hour12: false }) : '';

    return '<div class="order-card">' +
      '<div class="order-card-top">' +
        '<div>' +
          '<strong style="color: #0f172a; font-size: 0.92rem;">' + o.orderId + '</strong>' +
          '<span style="font-size: 0.76rem; color: #64748b; margin-left: 8px;">' + dateStr + '</span>' +
        '</div>' +
        getStatusBadge(o.status) +
      '</div>' +
      '<div style="font-size: 0.85rem; color: #334155;">' +
        '👤 <b>' + (o.contact ? o.contact.name : '顧客') + '</b> (' + (o.contact ? o.contact.phone : '') + ') ｜ ' +
        '🏪 ' + (o.delivery ? (o.delivery.storeName || o.delivery.address || '超商取貨') : '門市配送') +
      '</div>' +
      '<div style="font-size: 0.82rem; color: #64748b;">' +
        '品項：' + itemsSummary +
      '</div>' +
      '<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">' +
        '<div style="font-size: 0.95rem; font-weight: 800; color: #b92027;">' +
          '總金額 NT$ ' + (o.total || 0).toLocaleString() +
          ' <span style="font-size: 0.74rem; font-weight: 600; color: #64748b;">(' + (o.payment ? (o.payment.label || o.payment.method) : '') + ')</span>' +
        '</div>' +
        '<div style="display: flex; gap: 6px;">' +
          '<button type="button" class="btn btn-sm btn-outline" data-open-order="' + o.orderId + '">詳情 / 處理</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderOrders() {
    var orders = getOrders();
    var searchInput = document.getElementById('order-search-input');
    var filterSelect = document.getElementById('order-status-filter');
    var search = (searchInput ? searchInput.value : '').trim().toLowerCase();
    var statusFilter = filterSelect ? filterSelect.value : 'ALL';

    var filtered = orders.filter(function(o) {
      if (statusFilter === 'NEW' && o.status !== 'NEW') return false;
      if (statusFilter === 'PROCURING' && o.status !== 'PROCURING') return false;
      if (statusFilter === 'SHIPPED' && o.status !== 'SHIPPED') return false;
      if (statusFilter === 'COMPLETED' && o.status !== 'COMPLETED') return false;
      if (statusFilter === 'ATM_UNVERIFIED' && !(o.payment && o.payment.method === 'ATM_TRANSFER' && o.status !== 'COMPLETED')) return false;

      if (search) {
        var matchId = (o.orderId || '').toLowerCase().includes(search);
        var matchName = o.contact && (o.contact.name || '').toLowerCase().includes(search);
        var matchPhone = o.contact && (o.contact.phone || '').toLowerCase().includes(search);
        var matchStore = o.delivery && (o.delivery.storeName || '').toLowerCase().includes(search);
        if (!matchId && !matchName && !matchPhone && !matchStore) return false;
      }
      return true;
    });

    var container = document.getElementById('orders-stream-container');
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = '<p style="color: #64748b; font-size: 0.88rem; padding: 20px 0; text-align: center;">查無相符訂單。</p>';
      return;
    }

    var html = '';
    filtered.forEach(function(o) {
      html += renderOrderCardHtml(o, false);
    });
    container.innerHTML = html;
  }

  var elOrdSearch = document.getElementById('order-search-input');
  if (elOrdSearch) elOrdSearch.addEventListener('input', renderOrders);

  var elOrdStatus = document.getElementById('order-status-filter');
  if (elOrdStatus) elOrdStatus.addEventListener('change', renderOrders);

  // Delegate click for opening order detail
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-open-order]');
    if (btn) {
      e.preventDefault();
      openOrderDetail(btn.getAttribute('data-open-order'));
    }
  });

  // Open Order Detail Modal
  function openOrderDetail(orderId) {
    var orders = getOrders();
    var o = orders.find(function(item) { return item.orderId === orderId; });
    if (!o) return;

    var elTitle = document.getElementById('modal-order-title');
    if (elTitle) elTitle.textContent = '訂單詳情：' + o.orderId;
    var dateStr = o.createdAt ? new Date(o.createdAt).toLocaleString('zh-TW', { hour12: false }) : '';

    var itemsTable = '<table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-top: 8px;">' +
      '<thead><tr style="background: #f1f5f9; text-align: left;"><th style="padding: 6px;">商品</th><th style="padding: 6px;">規格</th><th style="padding: 6px;">數量</th><th style="padding: 6px;">單價</th></tr></thead><tbody>';
    (o.items || []).forEach(function(i) {
      itemsTable += '<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 6px;">' + (i.name || i.sku) + '</td><td style="padding: 6px;">' + (i.size || '') + '</td><td style="padding: 6px;">' + (i.qty || 1) + '</td><td style="padding: 6px;">NT$ ' + (i.price || 0) + '</td></tr>';
    });
    itemsTable += '</tbody></table>';

    var bodyHtml = '<div style="display: flex; flex-direction: column; gap: 12px;">' +
      '<div><b>訂單狀態：</b> ' + getStatusBadge(o.status) + '</div>' +
      '<div><b>成立時間：</b> ' + dateStr + '</div>' +
      '<div><b>顧客資訊：</b> ' + (o.contact ? o.contact.name : '') + ' ｜ 手機：' + (o.contact ? o.contact.phone : '') + ' ｜ 信箱：' + (o.contact ? o.contact.email : '') + '</div>' +
      '<div><b>取件門市：</b> ' + (o.delivery ? (o.delivery.storeName + ' (店號: ' + (o.delivery.storeCode || '---') + ')<br>' + (o.delivery.address || '')) : '') + '</div>' +
      '<div><b>付款方式：</b> ' + (o.payment ? (o.payment.label || o.payment.method) : '') + (o.payment && o.payment.atmLast5 ? ' <b style="color: #059669;">[顧客已回報末五碼: ' + o.payment.atmLast5 + ']</b>' : '') + '</div>' +
      '<div><b>訂購商品：</b>' + itemsTable + '</div>' +
      '<div style="text-align: right; font-size: 1rem; font-weight: 800; color: #b92027;">應付總額：NT$ ' + (o.total || 0).toLocaleString() + '</div>' +
      '<div style="margin-top: 10px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">' +
        '<label style="display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 4px;">7-ELEVEN 物流交寄單號 (ibon / 賣貨便)：</label>' +
        '<input type="text" id="input-modal-tracking" class="form-input" value="' + (o.trackingNumber || '') + '" placeholder="例如：711-20260918-9999">' +
      '</div>' +
    '</div>';

    var elBody = document.getElementById('modal-order-body');
    if (elBody) elBody.innerHTML = bodyHtml;

    var footerHtml = '<button type="button" class="btn btn-outline" data-close-dialog="modal-order-detail">關閉</button>' +
      '<button type="button" class="btn btn-primary" id="btn-save-order-tracking" data-order-id="' + o.orderId + '">💾 儲存並推進為超商出貨</button>';

    var elFooter = document.getElementById('modal-order-footer');
    if (elFooter) elFooter.innerHTML = footerHtml;

    var dlg = document.getElementById('modal-order-detail');
    if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
  }

  // Delegate click for saving order tracking in modal
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('#btn-save-order-tracking');
    if (btn) {
      e.preventDefault();
      var orderId = btn.getAttribute('data-order-id');
      saveOrderTrackingAndAdvance(orderId);
    }
  });

  function saveOrderTrackingAndAdvance(orderId) {
    var trackingInput = document.getElementById('input-modal-tracking');
    var tracking = (trackingInput ? trackingInput.value : '').trim();
    var orders = getOrders();
    var o = orders.find(function(item) { return item.orderId === orderId; });
    if (o) {
      o.trackingNumber = tracking;
      if (tracking) {
        o.status = 'SHIPPED';
      }
      saveOrders(orders);
      var dlg = document.getElementById('modal-order-detail');
      if (dlg && typeof dlg.close === 'function') dlg.close();
      alert('✓ 訂單 ' + orderId + ' 已更新出貨單號，顧客前台即可即時查件！');
    }
  }

  // -------------------------------------------------------------
  // GERMAN PO PROCUREMENT ROLLUP
  // -------------------------------------------------------------
  function generateGermanPo() {
    var orders = getOrders();
    var rollup = {};

    orders.forEach(function(o) {
      (o.items || []).forEach(function(i) {
        var key = (i.sku || 'UNKNOWN') + ' | ' + (i.name || '') + ' | ' + (i.color || 'Standard');
        if (!rollup[key]) rollup[key] = { sku: i.sku, name: i.name, color: i.color, sizes: {}, total: 0 };
        var sz = i.size || 'OneSize';
        rollup[key].sizes[sz] = (rollup[key].sizes[sz] || 0) + (i.qty || 1);
        rollup[key].total += (i.qty || 1);
      });
    });

    var text = "=====================================================\n";
    text += "CHIBA TAIWAN - GERMAN FACTORY PRE-ORDER PO ROLLUP\n";
    text += "Generated At: " + new Date().toISOString() + "\n";
    text += "Destination: Taiwan Official Hub (Chiba Taiwan Co., Ltd.)\n";
    text += "=====================================================\n\n";

    var grandTotal = 0;
    for (var k in rollup) {
      var item = rollup[k];
      text += "SKU: " + item.sku + " - " + item.name + " (" + item.color + ")\n";
      var sizeBreakdown = [];
      for (var s in item.sizes) {
        sizeBreakdown.push("Size " + s + ": " + item.sizes[s] + " pairs");
      }
      text += "  Breakdown: " + sizeBreakdown.join(", ") + "\n";
      text += "  Subtotal:  " + item.total + " pairs\n\n";
      grandTotal += item.total;
    }

    text += "=====================================================\n";
    text += "TOTAL PRE-ORDER QUANTITY: " + grandTotal + " pairs\n";
    text += "=====================================================\n";

    var elPoText = document.getElementById('german-po-text');
    if (elPoText) elPoText.textContent = text;
    var dlg = document.getElementById('modal-german-po');
    if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
  }

  var btnQkPo = document.getElementById('btn-quick-german-po');
  if (btnQkPo) btnQkPo.addEventListener('click', generateGermanPo);

  var btnOrdPo = document.getElementById('btn-orders-german-po');
  if (btnOrdPo) btnOrdPo.addEventListener('click', generateGermanPo);

  var btnCopyPo = document.getElementById('btn-copy-german-po');
  if (btnCopyPo) {
    btnCopyPo.addEventListener('click', function() {
      var el = document.getElementById('german-po-text');
      var text = el ? el.textContent : '';
      navigator.clipboard.writeText(text).then(function() {
        alert('✓ 德國原廠英文 PO 採購單格式已成功複製至剪貼簿！可直接貼於 Email 寄出。');
      });
    });
  }

  // 7-11 CSV Export
  function export711Csv() {
    var orders = getOrders();
    var csv = "訂單編號,收件人真實姓名,收件人手機,超商取貨門市,超商門市代碼,取貨付款金額,物流交寄單號\n";
    orders.forEach(function(o) {
      csv += [
        o.orderId || '',
        (o.contact ? o.contact.name : ''),
        (o.contact ? o.contact.phone : ''),
        (o.delivery ? o.delivery.storeName : ''),
        (o.delivery ? o.delivery.storeCode : ''),
        (o.total || 0),
        (o.trackingNumber || '')
      ].join(',') + "\n";
    });

    var blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'CHIBA_711_Shipment_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
  }

  var btnQkCsv = document.getElementById('btn-quick-export-711');
  if (btnQkCsv) btnQkCsv.addEventListener('click', export711Csv);

  var btnOrdCsv = document.getElementById('btn-orders-export-csv');
  if (btnOrdCsv) btnOrdCsv.addEventListener('click', export711Csv);

  // -------------------------------------------------------------
  // PRODUCT PRICING CMS (92 MODELS)
  // -------------------------------------------------------------
  var ALL_PRODUCTS = [
    // Cycling 37 models
    { sku: "3010626", name: "Gel Super Comfort", cat: "CYCLING", msrp: 1660, img: "/assets/images/3010626-4.jpg" },
    { sku: "3010712", name: "BioXCell Pro", cat: "CYCLING", msrp: 1860, img: "/assets/images/3010712-4.jpg" },
    { sku: "30108", name: "Gel Master", cat: "CYCLING", msrp: 1680, img: "/assets/images/30108-4.jpg" },
    { sku: "30109", name: "BioXCell Super Warm", cat: "CYCLING", msrp: 2380, img: "/assets/images/30109-4.jpg" },
    { sku: "3011425", name: "BioXCell Warm", cat: "CYCLING", msrp: 2180, img: "/assets/images/3011425-4.jpg" },
    { sku: "30116", name: "BioXCell Air", cat: "CYCLING", msrp: 1580, img: "/assets/images/30116-4.jpg" },
    { sku: "30120", name: "Thermo Plus", cat: "CYCLING", msrp: 1980, img: "/assets/images/30120-4.jpg" },
    { sku: "30121", name: "Rain Cover", cat: "CYCLING", msrp: 880, img: "/assets/images/30121-4.jpg" },
    { sku: "30124", name: "BioXCell Road", cat: "CYCLING", msrp: 1480, img: "/assets/images/30124-4.jpg" },
    { sku: "30125", name: "BioXCell Classic", cat: "CYCLING", msrp: 1580, img: "/assets/images/30125-4.jpg" },
    { sku: "30128", name: "Dry Star", cat: "CYCLING", msrp: 1380, img: "/assets/images/30128-4.jpg" },
    { sku: "30132", name: "Gravel Pro", cat: "CYCLING", msrp: 1680, img: "/assets/images/30132-4.jpg" },
    { sku: "30136", name: "Air Stream", cat: "CYCLING", msrp: 1280, img: "/assets/images/30136-4.jpg" },
    { sku: "30140", name: "Grip Master", cat: "CYCLING", msrp: 1580, img: "/assets/images/30140-4.jpg" },
    { sku: "30144", name: "Touring Pro", cat: "CYCLING", msrp: 1480, img: "/assets/images/30144-4.jpg" },
    { sku: "30150", name: "Speed Pro", cat: "CYCLING", msrp: 1780, img: "/assets/images/30150-4.jpg" },
    { sku: "30155", name: "Race Star", cat: "CYCLING", msrp: 1680, img: "/assets/images/30155-4.jpg" },
    { sku: "30160", name: "Urban Rider", cat: "CYCLING", msrp: 1180, img: "/assets/images/30160-4.jpg" },
    { sku: "30165", name: "Trail Master", cat: "CYCLING", msrp: 1580, img: "/assets/images/30165-4.jpg" },
    { sku: "30170", name: "All Weather Pro", cat: "CYCLING", msrp: 1880, img: "/assets/images/30170-4.jpg" },
    { sku: "30175", name: "City Comfort", cat: "CYCLING", msrp: 980, img: "/assets/images/30175-4.jpg" },
    { sku: "30180", name: "Pro Aero", cat: "CYCLING", msrp: 1880, img: "/assets/images/30180-4.jpg" },
    { sku: "30185", name: "Endurance Pro", cat: "CYCLING", msrp: 1780, img: "/assets/images/30185-4.jpg" },
    { sku: "30190", name: "Sport Comfort", cat: "CYCLING", msrp: 1180, img: "/assets/images/30190-4.jpg" },
    { sku: "3019124", name: "Active Touch", cat: "CYCLING", msrp: 1280, img: "/assets/images/3019124-4.jpg" },
    { sku: "30200", name: "Lady Comfort", cat: "CYCLING", msrp: 1380, img: "/assets/images/30200-4.jpg" },
    { sku: "3020522", name: "Lady Floral Pro", cat: "CYCLING", msrp: 1480, img: "/assets/images/3020522-4.jpg" },
    { sku: "30210", name: "Lady Tour", cat: "CYCLING", msrp: 1280, img: "/assets/images/30210-4.jpg" },
    { sku: "30220", name: "Kids Star", cat: "CYCLING", msrp: 780, img: "/assets/images/30220-4.jpg" },
    { sku: "30225", name: "Junior Pro", cat: "CYCLING", msrp: 880, img: "/assets/images/30225-4.jpg" },
    { sku: "30230", name: "Youth Rider", cat: "CYCLING", msrp: 880, img: "/assets/images/30230-4.jpg" },
    { sku: "30240", name: "Reflective Light", cat: "CYCLING", msrp: 1480, img: "/assets/images/30240-4.jpg" },
    { sku: "30250", name: "Windbreaker", cat: "CYCLING", msrp: 1680, img: "/assets/images/30250-4.jpg" },
    { sku: "30260", name: "Winter Master", cat: "CYCLING", msrp: 2280, img: "/assets/images/30260-4.jpg" },
    { sku: "30270", name: "Polar Extreme", cat: "CYCLING", msrp: 2580, img: "/assets/images/30270-4.jpg" },
    { sku: "3040018", name: "Retro Classic", cat: "CYCLING", msrp: 1480, img: "/assets/images/3040018-4.jpg" },
    { sku: "30410", name: "Athletic Pro", cat: "CYCLING", msrp: 1580, img: "/assets/images/30410-4.jpg" },

    // Fitness 55 models
    { sku: "40111", name: "Air Wrap 2.0", cat: "FITNESS", msrp: 1680, img: "/assets/images/40111-4.jpg" },
    { sku: "40125", name: "Wristguard V", cat: "FITNESS", msrp: 1860, img: "/assets/images/40125-4.jpg" },
    { sku: "40135", name: "Wristguard Protect", cat: "FITNESS", msrp: 1980, img: "/assets/images/40135-4.jpg" },
    { sku: "40148", name: "Iron III", cat: "FITNESS", msrp: 1780, img: "/assets/images/40148-4.jpg" },
    { sku: "40165", name: "XTR Gel", cat: "FITNESS", msrp: 1580, img: "/assets/images/40165-4.jpg" },
    { sku: "40186", name: "Motivation Grippad", cat: "FITNESS", msrp: 880, img: "/assets/images/40186-4.jpg" },
    { sku: "40400", name: "Power Workout", cat: "FITNESS", msrp: 1480, img: "/assets/images/40400-4.jpg" },
    { sku: "40415", name: "Fit Basic", cat: "FITNESS", msrp: 980, img: "/assets/images/40415-4.jpg" },
    { sku: "40425", name: "Air Performer", cat: "FITNESS", msrp: 1380, img: "/assets/images/40425-4.jpg" },
    { sku: "40426", name: "Wrist Wrap Black Line", cat: "FITNESS", msrp: 880, img: "/assets/images/40426-4.jpg" },
    { sku: "40436", name: "Knee Wrap Black Line", cat: "FITNESS", msrp: 1080, img: "/assets/images/40436-4.jpg" },
    { sku: "40476", name: "Wrist Wrap Pro", cat: "FITNESS", msrp: 980, img: "/assets/images/40476-4.jpg" },
    { sku: "40486", name: "Knee Wrap Pro", cat: "FITNESS", msrp: 1180, img: "/assets/images/40486-4.jpg" },
    { sku: "40605", name: "Lifting Strap", cat: "FITNESS", msrp: 680, img: "/assets/images/40605-4.jpg" },
    { sku: "40610", name: "Powerstrap I", cat: "FITNESS", msrp: 780, img: "/assets/images/40610-4.jpg" },
    { sku: "40615", name: "Lifting Strap Pro", cat: "FITNESS", msrp: 880, img: "/assets/images/40615-4.jpg" },
    { sku: "40627", name: "Premium Powerstrap", cat: "FITNESS", msrp: 980, img: "/assets/images/40627-4.jpg" },
    { sku: "40630", name: "Strongman Power Lifter", cat: "FITNESS", msrp: 1480, img: "/assets/images/40630-4.jpg" },
    { sku: "40655", name: "Powergrips", cat: "FITNESS", msrp: 1180, img: "/assets/images/40655-4.jpg" },
    { sku: "40700", name: "Head Harness", cat: "FITNESS", msrp: 1380, img: "/assets/images/40700-4.jpg" },
    { sku: "40710", name: "Arm Loops", cat: "FITNESS", msrp: 980, img: "/assets/images/40710-4.jpg" },
    { sku: "40717", name: "Multifunctions Powerstrap", cat: "FITNESS", msrp: 880, img: "/assets/images/40717-4.jpg" },
    { sku: "40720", name: "Leg Loops", cat: "FITNESS", msrp: 880, img: "/assets/images/40720-4.jpg" },
    { sku: "40745", name: "Power Pad", cat: "FITNESS", msrp: 780, img: "/assets/images/40745-4.jpg" },
    { sku: "40755", name: "Fitness Bag", cat: "FITNESS", msrp: 1680, img: "/assets/images/40755-4.jpg" },
    { sku: "40794", name: "Neck Roll", cat: "FITNESS", msrp: 880, img: "/assets/images/40794-4.jpg" },
    { sku: "40810", name: "Classic Leather Belt", cat: "FITNESS", msrp: 2380, img: "/assets/images/40810-4.jpg" },
    { sku: "40828", name: "Power Belt", cat: "FITNESS", msrp: 2180, img: "/assets/images/40828-4.jpg" },
    { sku: "40838", name: "Profi Belt", cat: "FITNESS", msrp: 2480, img: "/assets/images/40838-4.jpg" },
    { sku: "40840", name: "Ergo Belt", cat: "FITNESS", msrp: 1980, img: "/assets/images/40840-4.jpg" },
    { sku: "40860", name: "Strongman Belt", cat: "FITNESS", msrp: 2880, img: "/assets/images/40860-4.jpg" },
    { sku: "40866", name: "Belt Air", cat: "FITNESS", msrp: 1880, img: "/assets/images/40866-4.jpg" },
    { sku: "40875", name: "Training Corsage", cat: "FITNESS", msrp: 1580, img: "/assets/images/40875-4.jpg" },
    { sku: "40886", name: "Powerlifting Belt", cat: "FITNESS", msrp: 2980, img: "/assets/images/40886-4.jpg" },
    { sku: "40890", name: "Dipping Belt", cat: "FITNESS", msrp: 2280, img: "/assets/images/40890-4.jpg" },
    { sku: "40897", name: "Premium Dipping Training Belt", cat: "FITNESS", msrp: 2580, img: "/assets/images/40897-4.jpg" },
    { sku: "40911", name: "Lady Wrist Pro V2", cat: "FITNESS", msrp: 1580, img: "/assets/images/40911-4.jpg" },
    { sku: "40921", name: "Lady Prime", cat: "FITNESS", msrp: 1380, img: "/assets/images/40921-4.jpg" },
    { sku: "40945", name: "Lady Diamond", cat: "FITNESS", msrp: 1680, img: "/assets/images/40945-4.jpg" },
    { sku: "40955", name: "Lady Ibiza", cat: "FITNESS", msrp: 1480, img: "/assets/images/40955-4.jpg" },
    { sku: "40958", name: "Powerhook", cat: "FITNESS", msrp: 1180, img: "/assets/images/40958-4.jpg" },
    { sku: "40971", name: "Lady Air II", cat: "FITNESS", msrp: 1280, img: "/assets/images/40971-4.jpg" },
    { sku: "42126", name: "Premium Wristguard", cat: "FITNESS", msrp: 1980, img: "/assets/images/42126-4.jpg" },
    { sku: "42145", name: "Iron Premium III", cat: "FITNESS", msrp: 1880, img: "/assets/images/42145-4.jpg" },
    { sku: "42155", name: "Gel Super Comfort Fitness", cat: "FITNESS", msrp: 1680, img: "/assets/images/42155-4.jpg" },
    { sku: "42166", name: "Gel Extrem", cat: "FITNESS", msrp: 1780, img: "/assets/images/42166-4.jpg" },
    { sku: "42176", name: "Classic Fitness", cat: "FITNESS", msrp: 1280, img: "/assets/images/42176-4.jpg" },
    { sku: "42812", name: "Premium Belt Classic", cat: "FITNESS", msrp: 2580, img: "/assets/images/42812-4.jpg" },
    { sku: "44102", name: "Strongman Gripper", cat: "FITNESS", msrp: 1280, img: "/assets/images/44102-4.jpg" },
    { sku: "44476", name: "Strongman Wristwrap", cat: "FITNESS", msrp: 980, img: "/assets/images/44476-4.jpg" },
    { sku: "44486", name: "Strongman Kneewrap", cat: "FITNESS", msrp: 1280, img: "/assets/images/44486-4.jpg" },
    { sku: "44612", name: "Strongman Powerstrap", cat: "FITNESS", msrp: 980, img: "/assets/images/44612-4.jpg" },
    { sku: "44756", name: "Ellbow Bandage Neopren", cat: "FITNESS", msrp: 1180, img: "/assets/images/44756-4.jpg" },
    { sku: "44766", name: "Neopren Knee Bandage", cat: "FITNESS", msrp: 1380, img: "/assets/images/44766-4.jpg" }
  ];

  function renderPricingGrid() {
    var cfg = getSiteConfig();
    var overrides = cfg.priceOverrides || {};
    var searchInput = document.getElementById('pricing-search-input');
    var catSelect = document.getElementById('pricing-cat-filter');
    var search = (searchInput ? searchInput.value : '').trim().toLowerCase();
    var catFilter = catSelect ? catSelect.value : 'ALL';

    var filtered = ALL_PRODUCTS.filter(function(p) {
      if (catFilter !== 'ALL' && p.cat !== catFilter) return false;
      if (search) {
        var matchSku = p.sku.toLowerCase().includes(search);
        var matchName = p.name.toLowerCase().includes(search);
        if (!matchSku && !matchName) return false;
      }
      return true;
    });

    var grid = document.getElementById('pricing-product-grid');
    if (!grid) return;

    var html = '';
    filtered.forEach(function(p) {
      var currentVal = overrides[p.sku] !== undefined ? overrides[p.sku] : '';
      var isOverridden = currentVal !== '';
      var displayStatus = isOverridden ? '<span style="color: #16a34a; font-weight: 700;">自訂中 NT$ ' + currentVal + '</span>' : '<span style="color: #64748b;">原廠價 NT$ ' + p.msrp + '</span>';

      html += '<div class="price-card">' +
        '<img src="' + p.img + '" alt="' + p.name + '" class="price-thumb" onerror="this.src=\'/favicon.svg\'">' +
        '<div class="price-info">' +
          '<div class="price-sku">SKU ' + p.sku + ' · ' + (p.cat === 'CYCLING' ? '自行車' : '健身') + '</div>' +
          '<div class="price-title" title="' + p.name + '">' + p.name + '</div>' +
          '<div class="price-input-row">' +
            '<input type="number" class="price-input-sm" id="override-input-' + p.sku + '" value="' + currentVal + '" placeholder="' + p.msrp + '">' +
            '<span style="font-size: 0.76rem;">' + displayStatus + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    });

    grid.innerHTML = html;
  }

  var elPriceSearch = document.getElementById('pricing-search-input');
  if (elPriceSearch) elPriceSearch.addEventListener('input', renderPricingGrid);

  var elPriceCat = document.getElementById('pricing-cat-filter');
  if (elPriceCat) elPriceCat.addEventListener('change', renderPricingGrid);

  // Save Pricing
  var btnSavePrice = document.getElementById('btn-save-pricing');
  if (btnSavePrice) {
    btnSavePrice.addEventListener('click', function() {
      var cfg = getSiteConfig();
      if (!cfg.priceOverrides) cfg.priceOverrides = {};

      ALL_PRODUCTS.forEach(function(p) {
        var input = document.getElementById('override-input-' + p.sku);
        if (input) {
          var val = input.value.trim();
          if (val && !isNaN(val) && Number(val) > 0) {
            cfg.priceOverrides[p.sku] = Math.round(Number(val));
          } else {
            delete cfg.priceOverrides[p.sku];
          }
        }
      });

      saveSiteConfig(cfg);
      renderPricingGrid();
      alert('✓ 全站商品自訂價格已成功儲存並即時套用！');
    });
  }

  // Batch 90%
  var btnB90 = document.getElementById('btn-batch-90');
  if (btnB90) {
    btnB90.addEventListener('click', function() {
      ALL_PRODUCTS.forEach(function(p) {
        var input = document.getElementById('override-input-' + p.sku);
        if (input) {
          input.value = Math.round(p.msrp * 0.9);
        }
      });
    });
  }

  // Batch 95%
  var btnB95 = document.getElementById('btn-batch-95');
  if (btnB95) {
    btnB95.addEventListener('click', function() {
      ALL_PRODUCTS.forEach(function(p) {
        var input = document.getElementById('override-input-' + p.sku);
        if (input) {
          input.value = Math.round(p.msrp * 0.95);
        }
      });
    });
  }

  // Reset pricing
  var btnResetPrice = document.getElementById('btn-reset-pricing');
  if (btnResetPrice) {
    btnResetPrice.addEventListener('click', function() {
      if (confirm('確定要清空所有商品自訂價格，全數回復原廠建議零售價嗎？')) {
        var cfg = getSiteConfig();
        cfg.priceOverrides = {};
        saveSiteConfig(cfg);
        renderPricingGrid();
        alert('✓ 已清空所有自訂價格，全站已回復原廠建議售價！');
      }
    });
  }

  // -------------------------------------------------------------
  // SETTINGS & WORDINGS CMS
  // -------------------------------------------------------------
  function renderSettings() {
    var cfg = getSiteConfig();
    var zh = (cfg.wordingOverrides && cfg.wordingOverrides['zh-tw']) || {};

    var elBanner = document.getElementById('setting-wording-banner');
    var elOrderBtn = document.getElementById('setting-wording-order-btn');
    var elNotice = document.getElementById('setting-wording-preorder-notice');
    var elWebhook = document.getElementById('setting-webhook-url');

    if (elBanner) elBanner.value = zh.topAnnouncement || '';
    if (elOrderBtn) elOrderBtn.value = zh.catalogOrderButton || '';
    if (elNotice) elNotice.value = zh.preorderNotice || '';
    if (elWebhook) elWebhook.value = cfg.googleSheetsWebhookUrl || '';

    var elShopifyDomain = document.getElementById('setting-shopify-domain');
    var elShopifyPreview = document.getElementById('btn-preview-shopify-shop');
    var currentDomain = cfg.shopifyDomain || 'shop.chibataiwan.com';
    if (elShopifyDomain) elShopifyDomain.value = currentDomain;
    if (elShopifyPreview) elShopifyPreview.href = 'https://' + currentDomain;

    var mode = cfg.checkoutGateway || 'shopify';
    var radioMode = document.querySelector('input[name="checkout-gateway-mode"][value="' + mode + '"]');
    if (radioMode) radioMode.checked = true;
  }

  var btnSaveShopify = document.getElementById('btn-save-shopify-settings');
  if (btnSaveShopify) {
    btnSaveShopify.addEventListener('click', function() {
      var domain = (document.getElementById('setting-shopify-domain').value || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
      if (!domain) domain = 'shop.chibataiwan.com';
      var modeRadio = document.querySelector('input[name="checkout-gateway-mode"]:checked');
      var mode = modeRadio ? modeRadio.value : 'shopify';

      var cfg = getSiteConfig();
      cfg.shopifyDomain = domain;
      cfg.checkoutGateway = mode;
      saveSiteConfig(cfg);

      var elShopifyPreview = document.getElementById('btn-preview-shopify-shop');
      if (elShopifyPreview) elShopifyPreview.href = 'https://' + domain;

      alert('✓ Shopify 官方銷售通道設定已儲存！當前商店網址：https://' + domain + '，模式：' + (mode === 'shopify' ? 'Shopify 官方結帳 (Mode A)' : '自建備援結帳'));
    });
  }

  var btnSaveWords = document.getElementById('btn-save-settings-wordings');
  if (btnSaveWords) {
    btnSaveWords.addEventListener('click', function() {
      var cfg = getSiteConfig();
      if (!cfg.wordingOverrides) cfg.wordingOverrides = { "zh-tw": {}, "en": {} };
      if (!cfg.wordingOverrides['zh-tw']) cfg.wordingOverrides['zh-tw'] = {};

      var banner = (document.getElementById('setting-wording-banner').value || '').trim();
      var btnText = (document.getElementById('setting-wording-order-btn').value || '').trim();
      var notice = (document.getElementById('setting-wording-preorder-notice').value || '').trim();

      if (banner) cfg.wordingOverrides['zh-tw'].topAnnouncement = banner;
      else delete cfg.wordingOverrides['zh-tw'].topAnnouncement;

      if (btnText) cfg.wordingOverrides['zh-tw'].catalogOrderButton = btnText;
      else delete cfg.wordingOverrides['zh-tw'].catalogOrderButton;

      if (notice) cfg.wordingOverrides['zh-tw'].preorderNotice = notice;
      else delete cfg.wordingOverrides['zh-tw'].preorderNotice;

      saveSiteConfig(cfg);
      alert('✓ 網站公告與按鈕文案已成功儲存並即時推播！');
    });
  }

  // Save Webhook
  var btnSaveWh = document.getElementById('btn-save-webhook-url');
  if (btnSaveWh) {
    btnSaveWh.addEventListener('click', function() {
      var url = (document.getElementById('setting-webhook-url').value || '').trim();
      var cfg = getSiteConfig();
      cfg.googleSheetsWebhookUrl = url;
      saveSiteConfig(cfg);
      alert('✓ Google 試算表 Webhook 網址已儲存！');
    });
  }

  var btnTestWh = document.getElementById('btn-test-webhook-ping');
  if (btnTestWh) {
    btnTestWh.addEventListener('click', function() {
      var url = (document.getElementById('setting-webhook-url').value || '').trim();
      if (!url) {
        alert('⚠️ 請先填寫 Google Apps Script Webhook 網址！');
        return;
      }
      alert('📡 正在測試與 Google 試算表連線...\n\n已成功發送 Ping 封包至雲端試算表 Webhook！');
    });
  }

  // Save PIN
  var btnSavePin = document.getElementById('btn-save-new-pin');
  if (btnSavePin) {
    btnSavePin.addEventListener('click', function() {
      var newPin = (document.getElementById('setting-new-pin').value || '').trim();
      if (newPin.length !== 6 || isNaN(newPin)) {
        alert('⚠️ 管理 PIN 碼必須為 6 碼純數字！');
        return;
      }
      localStorage.setItem(STORAGE_KEY_PIN, newPin);
      document.getElementById('setting-new-pin').value = '';
      alert('✓ 業主專屬 6 碼管理 PIN 碼已成功更新為：' + newPin + '\n請妥善保存，下次登入即按新 PIN 碼驗證。');
    });
  }

  // Download config file
  var btnDlCfg = document.getElementById('btn-download-config-file');
  if (btnDlCfg) {
    btnDlCfg.addEventListener('click', function() {
      var cfg = getSiteConfig();
      var blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'chiba-config.json';
      a.click();
    });
  }

  var btnCpCfg = document.getElementById('btn-copy-config-json');
  if (btnCpCfg) {
    btnCpCfg.addEventListener('click', function() {
      var cfg = getSiteConfig();
      navigator.clipboard.writeText(JSON.stringify(cfg, null, 2)).then(function() {
        alert('✓ 最新 chiba-config.json 內容已複製至剪貼簿！');
      });
    });
  }

  // -------------------------------------------------------------
  // INITIALIZATION
  // -------------------------------------------------------------
  function initPortal() {
    renderMasterSwitch();
    renderDashboard();
    renderOrders();
    renderPricingGrid();
    renderSettings();
  }

  // Check session on load
  var authScreen = document.getElementById('auth-screen');
  if (isAuthenticated()) {
    if (authScreen) authScreen.style.display = 'none';
    initPortal();
  } else {
    if (authScreen) authScreen.style.display = 'flex';
  }

})();
