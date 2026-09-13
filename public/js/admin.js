// Shared admin panel behaviour: mobile sidebar drawer + confirm-before-delete.
(function () {
  'use strict';

  var toggle = document.getElementById('adminMenuToggle');
  var sidebar = document.getElementById('adminSidebar');
  var backdrop = document.getElementById('adminBackdrop');

  function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
  }
  function openSidebar() {
    sidebar.classList.add('open');
    backdrop.classList.add('open');
  }

  if (toggle && sidebar && backdrop) {
    toggle.addEventListener('click', function () {
      if (sidebar.classList.contains('open')) closeSidebar();
      else openSidebar();
    });
    backdrop.addEventListener('click', closeSidebar);
    Array.prototype.forEach.call(sidebar.querySelectorAll('a'), function (a) {
      a.addEventListener('click', closeSidebar);
    });
  }

  // Any form or button marked data-confirm="..." asks before submitting -
  // used on every delete action so a stray tap on a phone can't wipe data.
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form && form.hasAttribute && form.hasAttribute('data-confirm')) {
      var msg = form.getAttribute('data-confirm') || 'Are you sure?';
      if (!window.confirm(msg)) {
        e.preventDefault();
      }
    }
  });

  // Live image preview for any <input type="file"> with a matching
  // [data-preview-for="<input id>"] <img> element next to it.
  Array.prototype.forEach.call(document.querySelectorAll('input[type="file"]'), function (input) {
    var preview = document.querySelector('[data-preview-for="' + input.id + '"]');
    if (!preview) return;
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) { preview.src = e.target.result; };
      reader.readAsDataURL(file);
    });
  });

  // Auto-dismiss success/error banners after a few seconds so they don't
  // pile up as the admin moves between pages.
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll('.alert'), function (el) {
      el.style.transition = 'opacity 0.4s ease';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 400);
    });
  }, 6000);
})();
