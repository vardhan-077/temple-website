// Shared front-end behaviour for the public site: mobile nav, copy-to-clipboard,
// gallery lightbox, festival countdown, and the shopping cart engine (badge +
// localStorage helpers used by js/shop.js on the shop/cart/checkout pages).
// Loaded on every public page.
(function () {
  'use strict';

  function formatINR(n) {
    return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  // ---------- Mobile nav toggle ----------
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    Array.prototype.forEach.call(navLinks.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---------- Copy to clipboard (UPI ID, account number, IFSC, ...) ----------
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy-text]'), function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy-text') || '';
      var done = function () {
        var original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = original; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
      } else {
        fallbackCopy(text, done);
      }
    });
  });

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  // ---------- Gallery lightbox ----------
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxCaption = document.getElementById('lightboxCaption');
  var lightboxClose = document.getElementById('lightboxClose');

  function openLightbox(src, caption) {
    if (!lightbox) return;
    lightboxImg.src = src;
    lightboxImg.alt = caption || '';
    lightboxCaption.textContent = caption || '';
    lightbox.classList.add('open');
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    lightboxImg.src = '';
  }
  Array.prototype.forEach.call(document.querySelectorAll('.gallery-item'), function (item) {
    item.addEventListener('click', function () {
      var img = item.querySelector('img');
      openLightbox(item.getAttribute('data-full') || (img && img.src), item.getAttribute('data-caption'));
    });
  });
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });

  // ---------- Announcement expand/collapse ----------
  Array.prototype.forEach.call(document.querySelectorAll('.announcement-toggle-link'), function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.announcement-card');
      var preview = card.querySelector('.announcement-preview');
      var full = card.querySelector('.announcement-full');
      var expanded = card.classList.toggle('expanded');
      var moreLabel = btn.getAttribute('data-more') || 'Read more';
      var lessLabel = btn.getAttribute('data-less') || 'Show less';
      if (expanded) {
        preview.hidden = true;
        full.hidden = false;
        btn.innerHTML = lessLabel + ' <span class="chev">&#9662;</span>';
      } else {
        preview.hidden = false;
        full.hidden = true;
        btn.innerHTML = moreLabel + ' <span class="chev">&#9662;</span>';
      }
    });
  });

  // ---------- Festival countdown(s) ----------
  // Drives every countdown card on the page independently (the homepage can
  // show several at once - one per ongoing/upcoming festival).
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  Array.prototype.forEach.call(document.querySelectorAll('.countdown-card[data-target]'), function (countdownEl) {
    var target = new Date(countdownEl.getAttribute('data-target')).getTime();
    var doneMessage = countdownEl.getAttribute('data-done-message') || 'The festival is here!';
    var units = {
      days: countdownEl.querySelector('[data-unit="days"]'),
      hours: countdownEl.querySelector('[data-unit="hours"]'),
      minutes: countdownEl.querySelector('[data-unit="minutes"]'),
      seconds: countdownEl.querySelector('[data-unit="seconds"]'),
    };
    var countdownTimer = setInterval(tickCountdown, 1000);
    tickCountdown();

    function tickCountdown() {
      var diff = target - Date.now();
      if (diff <= 0) {
        clearInterval(countdownTimer);
        countdownEl.innerHTML = '<p class="countdown-name">' + doneMessage + '</p>';
        return;
      }
      var days = Math.floor(diff / 86400000);
      var hours = Math.floor((diff % 86400000) / 3600000);
      var minutes = Math.floor((diff % 3600000) / 60000);
      var seconds = Math.floor((diff % 60000) / 1000);
      if (units.days) units.days.textContent = days;
      if (units.hours) units.hours.textContent = pad(hours);
      if (units.minutes) units.minutes.textContent = pad(minutes);
      if (units.seconds) units.seconds.textContent = pad(seconds);
    }
  });

  // ---------- Shared cart engine (localStorage) ----------
  // The cart lives entirely in the browser - nothing here reaches the server
  // until checkout, and prices are always re-checked server-side at that
  // point (routes/api.js never trusts a client-submitted price). This file
  // loads on every public page so the nav cart badge stays current wherever
  // the visitor is; js/shop.js (loaded only on /products, /cart and
  // /checkout) uses window.TempleCart for the actual cart UI.
  var CART_KEY = 'templeCart_v1';

  function readCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      var cart = raw ? JSON.parse(raw) : [];
      return Array.isArray(cart) ? cart : [];
    } catch (e) {
      return [];
    }
  }

  function writeCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      /* storage unavailable (private browsing etc.) - cart just won't persist */
    }
    updateCartBadge();
  }

  function updateCartBadge() {
    var badge = document.getElementById('navCartBadge');
    if (!badge) return;
    var count = readCart().reduce(function (sum, item) { return sum + item.quantity; }, 0);
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  window.TempleCart = {
    get: readCart,
    save: writeCart,
    addItem: function (product, quantity) {
      quantity = Math.max(1, parseInt(quantity, 10) || 1);
      var cart = readCart();
      var existing = null;
      for (var i = 0; i < cart.length; i++) {
        if (cart[i].id === product.id) { existing = cart[i]; break; }
      }
      if (existing) {
        existing.quantity += quantity;
      } else {
        cart.push({ id: product.id, name: product.name, price: product.price, image: product.image || '', quantity: quantity });
      }
      writeCart(cart);
      return cart;
    },
    setQuantity: function (id, quantity) {
      quantity = Math.max(0, parseInt(quantity, 10) || 0);
      var cart = readCart();
      if (quantity === 0) {
        cart = cart.filter(function (i) { return i.id !== id; });
      } else {
        for (var i = 0; i < cart.length; i++) {
          if (cart[i].id === id) { cart[i].quantity = quantity; break; }
        }
      }
      writeCart(cart);
      return cart;
    },
    removeItem: function (id) {
      var cart = readCart().filter(function (i) { return i.id !== id; });
      writeCart(cart);
      return cart;
    },
    clear: function () { writeCart([]); },
    getCount: function () { return readCart().reduce(function (sum, item) { return sum + item.quantity; }, 0); },
    getTotal: function () { return readCart().reduce(function (sum, item) { return sum + item.price * item.quantity; }, 0); },
  };

  updateCartBadge();
})();
