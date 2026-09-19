// Shop pages only (loaded on /products, /cart and /checkout - see
// extraScript in routes/public.js). Handles the product catalog's "Add to
// Cart" controls, the cart page listing, and the checkout form + Razorpay-or
// -UPI payment flow. The cart itself lives in localStorage via
// window.TempleCart, defined in main.js which always loads first.
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

  // ---------- Product catalog (/products) ----------
  function initProductCatalog() {
    var rows = document.querySelectorAll('[data-product-row]');
    Array.prototype.forEach.call(rows, function (row) {
      var qtyEl = row.querySelector('[data-qty-value]');
      var downBtn = row.querySelector('[data-qty-down]');
      var upBtn = row.querySelector('[data-qty-up]');
      var addBtn = row.querySelector('[data-add-to-cart]');
      if (!qtyEl || !downBtn || !upBtn || !addBtn) return;

      downBtn.addEventListener('click', function () {
        var qty = Math.max(1, (parseInt(qtyEl.textContent, 10) || 1) - 1);
        qtyEl.textContent = qty;
      });
      upBtn.addEventListener('click', function () {
        var qty = Math.min(50, (parseInt(qtyEl.textContent, 10) || 1) + 1);
        qtyEl.textContent = qty;
      });
      addBtn.addEventListener('click', function () {
        var qty = parseInt(qtyEl.textContent, 10) || 1;
        window.TempleCart.addItem({
          id: row.getAttribute('data-product-id'),
          name: row.getAttribute('data-product-name'),
          price: Number(row.getAttribute('data-product-price')),
          image: row.getAttribute('data-product-image'),
        }, qty);
        qtyEl.textContent = '1';
        var originalLabel = addBtn.textContent;
        addBtn.textContent = 'Added!';
        addBtn.classList.add('added');
        setTimeout(function () {
          addBtn.textContent = originalLabel;
          addBtn.classList.remove('added');
        }, 1200);
      });
    });
  }

  // ---------- Cart page (/cart) ----------
  function renderCartLine(item) {
    var lineTotal = item.price * item.quantity;
    return (
      '<div class="cart-item" data-cart-line data-id="' + escapeHtml(item.id) + '">' +
        '<img src="' + escapeHtml(item.image || '/images/placeholders/gallery-temple.svg') + '" alt="">' +
        '<div class="cart-item-info">' +
          '<h4>' + escapeHtml(item.name) + '</h4>' +
          '<div class="cart-item-price">' + formatINR(item.price) + ' each</div>' +
        '</div>' +
        '<div class="cart-item-actions">' +
          '<div class="qty-stepper">' +
            '<button type="button" data-cart-qty-down aria-label="Decrease quantity">&minus;</button>' +
            '<span data-cart-qty-value>' + item.quantity + '</span>' +
            '<button type="button" data-cart-qty-up aria-label="Increase quantity">+</button>' +
          '</div>' +
          '<span class="cart-item-total">' + formatINR(lineTotal) + '</span>' +
          '<button type="button" class="cart-remove-btn" data-cart-remove>Remove</button>' +
        '</div>' +
      '</div>'
    );
  }

  function initCartPage() {
    var itemsEl = document.getElementById('cartItems');
    if (!itemsEl) return;
    var emptyEl = document.getElementById('cartEmpty');
    var filledEl = document.getElementById('cartFilled');
    var totalEl = document.getElementById('cartTotal');

    function draw() {
      var cart = window.TempleCart.get();
      if (!cart.length) {
        if (emptyEl) emptyEl.hidden = false;
        if (filledEl) filledEl.hidden = true;
        return;
      }
      if (emptyEl) emptyEl.hidden = true;
      if (filledEl) filledEl.hidden = false;
      itemsEl.innerHTML = cart.map(renderCartLine).join('');
      if (totalEl) totalEl.textContent = formatINR(window.TempleCart.getTotal());

      Array.prototype.forEach.call(itemsEl.querySelectorAll('[data-cart-line]'), function (line) {
        var id = line.getAttribute('data-id');
        var qtyEl = line.querySelector('[data-cart-qty-value]');
        line.querySelector('[data-cart-qty-down]').addEventListener('click', function () {
          var qty = (parseInt(qtyEl.textContent, 10) || 1) - 1;
          window.TempleCart.setQuantity(id, qty);
          draw();
        });
        line.querySelector('[data-cart-qty-up]').addEventListener('click', function () {
          var qty = Math.min(50, (parseInt(qtyEl.textContent, 10) || 1) + 1);
          window.TempleCart.setQuantity(id, qty);
          draw();
        });
        line.querySelector('[data-cart-remove]').addEventListener('click', function () {
          window.TempleCart.removeItem(id);
          draw();
        });
      });
    }

    draw();
  }

  // ---------- Checkout page (/checkout) ----------
  function renderCheckoutSummary() {
    var linesEl = document.getElementById('checkoutSummaryLines');
    var totalEl = document.getElementById('checkoutTotal');
    if (!linesEl) return;
    var cart = window.TempleCart.get();
    linesEl.innerHTML = cart.map(function (item) {
      return (
        '<div class="checkout-summary-line">' +
          '<span>' + escapeHtml(item.name) + '<span class="qty">&nbsp;&times;&nbsp;' + item.quantity + '</span></span>' +
          '<span>' + formatINR(item.price * item.quantity) + '</span>' +
        '</div>'
      );
    }).join('');
    if (totalEl) totalEl.textContent = formatINR(window.TempleCart.getTotal());
  }

  function initCheckoutPage() {
    var form = document.getElementById('checkoutForm');
    var emptyEl = document.getElementById('checkoutEmpty');
    var filledEl = document.getElementById('checkoutFilled');
    if (!form && !emptyEl) return;

    var cart = window.TempleCart.get();
    if (!cart.length) {
      if (emptyEl) emptyEl.hidden = false;
      if (filledEl) filledEl.hidden = true;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    if (filledEl) filledEl.hidden = false;
    renderCheckoutSummary();

    if (!form) return;

    var errorBox = document.getElementById('checkoutError');
    var placeBtn = document.getElementById('placeOrderBtn');

    function showError(msg) {
      errorBox.textContent = msg;
      errorBox.hidden = false;
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    function setLoading(isLoading) {
      placeBtn.disabled = isLoading;
      placeBtn.textContent = isLoading ? 'Please wait...' : 'Place Order';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorBox.hidden = true;

      var currentCart = window.TempleCart.get();
      if (!currentCart.length) {
        showError('Your cart is empty.');
        return;
      }

      var payload = {
        items: currentCart.map(function (i) { return { id: i.id, quantity: i.quantity }; }),
        customerName: document.getElementById('nameInput').value,
        phone: document.getElementById('phoneInput').value,
        email: document.getElementById('emailInput').value,
        address: document.getElementById('addressInput').value,
        note: document.getElementById('noteInput').value,
      };

      setLoading(true);

      fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          return r.json().then(function (data) { return { ok: r.ok, data: data }; });
        })
        .then(function (res) {
          if (!res.ok) throw new Error(res.data.error || 'Could not place your order.');
          var data = res.data;

          if (!data.razorpayEnabled) {
            window.TempleCart.clear();
            window.location.href = '/checkout/success?order=' + data.orderId;
            return;
          }

          if (typeof Razorpay === 'undefined') {
            throw new Error('Could not load the payment window. Please check your internet connection and try again.');
          }

          var rzp = new Razorpay({
            key: data.keyId,
            amount: data.amount,
            currency: data.currency,
            order_id: data.rzpOrderId,
            name: data.templeName,
            description: 'Temple Shop Order',
            prefill: {
              name: data.customerName || '',
              email: data.customerEmail || '',
              contact: data.customerPhone || '',
            },
            theme: { color: '#7a1414' },
            handler: function (response) {
              setLoading(true);
              fetch('/api/orders/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: data.orderId,
                }),
              })
                .then(function (r) { return r.json(); })
                .then(function (result) {
                  if (result.success) {
                    window.TempleCart.clear();
                    window.location.href = '/checkout/success?order=' + data.orderId;
                  } else {
                    setLoading(false);
                    showError(result.error || 'Payment verification failed. If money was deducted, please contact us with your payment ID.');
                  }
                })
                .catch(function () {
                  setLoading(false);
                  showError('Payment made, but we could not confirm it automatically. Please contact us with your payment ID.');
                });
            },
            modal: {
              ondismiss: function () { setLoading(false); },
            },
          });

          rzp.on('payment.failed', function (resp) {
            setLoading(false);
            showError('Payment failed: ' + (resp.error && resp.error.description ? resp.error.description : 'please try again.'));
          });

          rzp.open();
          setLoading(false);
        })
        .catch(function (err) {
          setLoading(false);
          showError(err.message);
        });
    });
  }

  initProductCatalog();
  initCartPage();
  initCheckoutPage();
})();
