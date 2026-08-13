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
    var overlay = open('<div class="modal-title">' + esc(label) + '</div>' +
      '<div class="modal-body">' +
      '<input class="modal-input" type="' + type + '" value="' + esc(initialValue == null ? '' : initialValue) + '"' + extra + ' />' +
      '</div>' +
      '<div class="modal-actions">' +
      '<button class="btnghost" data-m="cancel">Cancel</button>' +
      '<button class="btn" data-m="ok">Save</button>' +
      '</div>');
    bindButtons(overlay, function (result) {
      if (result !== true) return;
      var input = overlay.querySelector('.modal-input');
      var value = input.value;
      if (typeof onOk === 'function') onOk(value);
    });
    var input = overlay.querySelector('.modal-input');
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var ok = overlay.querySelector('[data-m="ok"]');
        if (ok) ok.click();
      }
    });
    return null;
  }

  /* multi-field form — formHtml is rendered into the modal body; onOk reads the overlay */
  function form(title, bodyHtml, onOk) {
    var overlay = open('<div class="modal-title">' + esc(title) + '</div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      '<div class="modal-actions">' +
      '<button class="btnghost" data-m="cancel">Cancel</button>' +
      '<button class="btn" data-m="ok">Save</button>' +
      '</div>');
    bindButtons(overlay, function (result) {
      if (result === true && typeof onOk === 'function') onOk(overlay);
    });
    var firstInput = overlay.querySelector('input, select');
    if (firstInput) {
      firstInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var ok = overlay.querySelector('[data-m="ok"]');
          if (ok) ok.click();
        }
      });
    }
  }

  /* picker(label[, options][, onPick][, opts]) — grid of tappable buttons; onPick(value).
     opts.corner = html label for a small button in the title corner; opts.onCorner() fires when tapped. */
  function picker(label, options, onPick, opts) {
    if (typeof options === 'function') { onPick = options; options = []; opts = {}; }
    if (typeof onPick !== 'function') { onPick = null; }
    if (typeof opts !== 'object' || opts === null) opts = {};
    var btns = (options || []).map(function (v) {
      return '<button type="button" class="pick-btn" data-v="' + v + '">' + v + '</button>';
    }).join('');
    var title = '<div class="modal-title"><span>' + esc(label) + '</span>' +
      (opts.corner ? '<button type="button" class="btnghost small modal-corner" data-modal-corner title="' + esc(opts.title || '') + '">' + opts.corner + '</button>' : '') +
      '</div>';
    var overlay = open(title +
      '<div class="modal-body pick-grid">' + (btns || '<div class="muted">No options.</div>') + '</div>' +
      '<div class="modal-actions"><button class="btnghost" data-m="cancel">Cancel</button></div>');
    overlay.addEventListener('click', function (e) {
      var cn = e.target.closest('[data-modal-corner]');
      if (cn) {
        close();
        if (typeof opts.onCorner === 'function') opts.onCorner();
        return;
      }
      var can = e.target.closest('[data-m="cancel"]');
      if (can) { close(); return; }
      var b = e.target.closest('.pick-btn');
      if (!b) return;
      var v = parseInt(b.getAttribute('data-v'), 10);
      close();
      if (typeof onPick === 'function') onPick(v);
    });
    return null;
  }

  /* custom(html) — open a modal with arbitrary content; returns the overlay for manual wiring */
  function custom(html) {
    return open(html);
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

  return { alert: alert, confirm: confirm, prompt: prompt, form: form, picker: picker, custom: custom, close: close };
})();
