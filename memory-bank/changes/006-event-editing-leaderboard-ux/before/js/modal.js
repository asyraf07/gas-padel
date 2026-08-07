/* modal.js — custom modal popups (replaces window.alert/confirm/prompt) */
var PadelApp = window.PadelApp || {};

PadelApp.modal = (function () {
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var current = null;

  function close() {
    if (!current) return;
    var overlay = current;
    current = null;
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.removeEventListener('keydown', onKey, true);
  }

  function onKey(e) {
    if (!current) return;
    if (e.key === 'Escape') close();
  }

  function open(html) {
    close();
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    document.body.appendChild(overlay);
    current = overlay;
    document.addEventListener('keydown', onKey, true);
    var first = overlay.querySelector('input, select, button');
    if (first) {
      setTimeout(function () {
        try { first.focus({ preventScroll: true }); } catch (e2) { first.focus(); }
      }, 0);
    }
    return overlay;
  }

  /* alert(message[, title]) — auto-dismissed message box */
  function alert(msg, title) {
    open('<div class="modal-title">' + esc(title || 'Notice') + '</div>' +
      '<div class="modal-body">' + esc(msg) + '</div>' +
      '<div class="modal-actions"><button class="btn modal-ok" data-m="ok">OK</button></div>');
    bindButtons(current);
  }

  /* confirm(message[, title[, onYes]]) — returns true/false, or calls onYes(bool) */
  function confirm(msg, title, onYes) {
    if (typeof title === 'function') { onYes = title; title = undefined; }
    open('<div class="modal-title">' + esc(title || 'Confirm') + '</div>' +
      '<div class="modal-body">' + esc(msg) + '</div>' +
      '<div class="modal-actions">' +
      '<button class="btnghost" data-m="no">Cancel</button>' +
      '<button class="btn" data-m="yes">OK</button>' +
      '</div>');
    bindButtons(current, function (result) {
      if (typeof onYes === 'function') onYes(result);
    });
    return null;
  }

  /* prompt(label[, initialValue[, onOk]]) — single text/number input; onOk(value) */
  function prompt(label, initialValue, onOk, attrs) {
    if (typeof initialValue === 'function') { onOk = initialValue; initialValue = ''; }
    if (typeof attrs !== 'object' || attrs === null) attrs = {};
    var type = attrs.type || 'text';
    var extra = '';
    if (attrs.required === false) extra += '';
    else extra += ' required';
    if (attrs.min !== undefined) extra += ' min="' + attrs.min + '"';
    if (attrs.max !== undefined) extra += ' max="' + attrs.max + '"';
    open('<div class="modal-title">' + esc(label) + '</div>' +
      '<div class="modal-body">' +
      '<input class="modal-input" type="' + type + '" value="' + esc(initialValue == null ? '' : initialValue) + '"' + extra + ' />' +
      '</div>' +
      '<div class="modal-actions">' +
      '<button class="btnghost" data-m="cancel">Cancel</button>' +
      '<button class="btn" data-m="ok">Save</button>' +
      '</div>');
    bindButtons(current, function (result) {
      if (result !== true) return;
      var input = current.querySelector('.modal-input');
      var value = input.value;
      if (typeof onOk === 'function') onOk(value);
    });
    var input = current.querySelector('.modal-input');
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var ok = current.querySelector('[data-m="ok"]');
        if (ok) ok.click();
      }
    });
    return null;
  }

  /* multi-field form — formHtml is rendered into the modal body; onOk reads the overlay */
  function form(title, bodyHtml, onOk) {
    open('<div class="modal-title">' + esc(title) + '</div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      '<div class="modal-actions">' +
      '<button class="btnghost" data-m="cancel">Cancel</button>' +
      '<button class="btn" data-m="ok">Save</button>' +
      '</div>');
    bindButtons(current, function (result) {
      if (result === true && typeof onOk === 'function') onOk(current);
    });
    var firstInput = current.querySelector('input, select');
    if (firstInput) {
      firstInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var ok = current.querySelector('[data-m="ok"]');
          if (ok) ok.click();
        }
      });
    }
  }

  function bindButtons(overlay, done) {
    overlay.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]');
      if (!b) return;
      var r = b.getAttribute('data-m');
      if (r === 'ok' || r === 'yes') r = true;
      else r = false;
      close();
      if (typeof done === 'function') done(r);
    });
  }

  return { alert: alert, confirm: confirm, prompt: prompt, form: form, close: close };
})();
