// Donate page only: amount chips, tab switching, and the Razorpay Checkout flow.
(function () {
  'use strict';

  // ---------- Tabs (Pay Online / Bank Transfer) ----------
  var tabButtons = document.querySelectorAll('.tab-btn');
  var tabPanels = {
    online: document.getElementById('tab-online'),
    'bank-transfer': document.getElementById('tab-bank-transfer'),
  };
  function activateTab(name) {
    Array.prototype.forEach.call(tabButtons, function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === name);
    });
    Object.keys(tabPanels).forEach(function (key) {
      if (tabPanels[key]) tabPanels[key].classList.toggle('active', key === name);
    });
  }
  Array.prototype.forEach.call(tabButtons, function (btn) {
    btn.addEventListener('click', function () { activateTab(btn.getAttribute('data-tab')); });
  });
  if (window.location.hash === '#bank-transfer') {
    activateTab('bank-transfer');
  }

  // ---------- Amount chips ----------
  var amountInput = document.getElementById('amountInput');
  var chips = document.querySelectorAll('.amount-chip');
  Array.prototype.forEach.call(chips, function (chip) {
    chip.addEventListener('click', function () {
      Array.prototype.forEach.call(chips, function (c) { c.classList.remove('selected'); });
      chip.classList.add('selected');
      amountInput.value = chip.getAttribute('data-amount');
    });
  });
  if (amountInput) {
    amountInput.addEventListener('input', function () {
      Array.prototype.forEach.call(chips, function (c) { c.classList.remove('selected'); });
    });
  }

  // ---------- Donation form -> Razorpay Checkout ----------
  var form = document.getElementById('donationForm');
  if (!form) return;

  var errorBox = document.getElementById('donationError');
  var payBtn = document.getElementById('payBtn');
  var razorpayEnabled = form.getAttribute('data-razorpay-enabled') === 'true';

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function setLoading(isLoading) {
    payBtn.disabled = isLoading;
    payBtn.textContent = isLoading ? 'Please wait...' : 'Proceed to Pay';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.hidden = true;

    if (!razorpayEnabled) {
      showError('Online payment is not set up on this site yet. Please use the Bank Transfer / UPI tab instead.');
      return;
    }
    if (typeof Razorpay === 'undefined') {
      showError('Could not load the payment window. Please check your internet connection and try again.');
      return;
    }

    var payload = {
      name: document.getElementById('nameInput').value,
      amount: amountInput.value,
      email: document.getElementById('emailInput').value,
      phone: document.getElementById('phoneInput').value,
      message: document.getElementById('messageInput').value,
      isAnonymous: document.getElementById('anonInput').checked,
    };

    setLoading(true);

    fetch('/api/donations/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json().then(function (data) { return { ok: r.ok, data: data }; });
      })
      .then(function (res) {
        if (!res.ok) throw new Error(res.data.error || 'Could not start payment.');
        var data = res.data;

        var rzp = new Razorpay({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          order_id: data.orderId,
          name: data.templeName,
          description: 'Temple Donation',
          prefill: {
            name: data.donorName || '',
            email: data.donorEmail || '',
            contact: data.donorPhone || '',
          },
          theme: { color: '#7a1414' },
          handler: function (response) {
            setLoading(true);
            fetch('/api/donations/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                donationId: data.donationId,
              }),
            })
              .then(function (r) { return r.json(); })
              .then(function (result) {
                if (result.success) {
                  window.location.href = '/donate/thank-you';
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
})();
