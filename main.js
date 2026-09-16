// Shared front-end behaviour for the public site: mobile nav, copy-to-clipboard,
// gallery lightbox, festival countdown, and live-ish polling for the
// donation progress bar and leaderboard. Loaded on every public page.
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

  // ---------- Live-ish progress bar + leaderboard polling ----------
  var progressFill = document.querySelector('[data-progress-fill]');
  var raisedEl = document.querySelector('[data-raised-amount]');
  var percentEl = document.querySelector('[data-raised-percent]');
  var donorCountEl = document.querySelector('[data-donor-count]');
  var leaderboardList = document.getElementById('leaderboardList');
  var POLL_MS = 20000;

  function refreshProgress() {
    if (!progressFill && !raisedEl) return;
    fetch('/api/settings/public')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var d = data.donation || {};
        if (progressFill) progressFill.style.width = (d.percent || 0) + '%';
        if (raisedEl) raisedEl.textContent = formatINR(d.raised) + ' raised';
        if (percentEl) percentEl.textContent = (d.percent || 0) + '%';
        if (donorCountEl) donorCountEl.textContent = d.donorCount || 0;
      })
      .catch(function () { /* fail silently - keep last known values on screen */ });
  }

  function refreshLeaderboard() {
    if (!leaderboardList) return;
    fetch('/api/leaderboard?limit=10')
      .then(function (r) { return r.json(); })
      .then(function (donors) {
        if (!donors || !donors.length) {
          leaderboardList.innerHTML = '<li class="leaderboard-empty">Be the first to donate today!</li>';
          return;
        }
        leaderboardList.innerHTML = donors
          .map(function (d, i) {
            return (
              '<li><span class="leaderboard-rank">' + (i + 1) + '</span>' +
              '<span class="leaderboard-name">' + escapeHtml(d.name) + '</span>' +
              '<span class="leaderboard-amount">' + formatINR(d.amount) + '</span></li>'
            );
          })
          .join('');
      })
      .catch(function () { /* keep last known list on screen */ });
  }

  if (progressFill || raisedEl || leaderboardList) {
    setInterval(refreshProgress, POLL_MS);
    setInterval(refreshLeaderboard, POLL_MS);
    // Slight delay before the first refresh since the page already rendered
    // fresh values on load - this just keeps them current after that.
    setTimeout(function () {
      refreshProgress();
      refreshLeaderboard();
    }, POLL_MS);
  }
})();
