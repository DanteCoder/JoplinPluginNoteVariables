// Runtime script executed INSIDE the Joplin markdown viewer webview.
// Self-executing: runs on load and re-runs after every note render
// (Joplin dispatches 'joplin-noteDidUpdate' on the document after rendering).
//
// It asks the plugin's main process for the current variables via
// webviewApi.postMessage, then recolors the import markers and substitutes
// variable values into the rendered note text.

(function () {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function process() {
    if (typeof webviewApi === 'undefined' || !webviewApi.postMessage) return;

    var markers = Array.prototype.slice.call(
      document.querySelectorAll('code.note-variables-import:not([data-nv-done])')
    );
    if (markers.length === 0) return;

    var contentScriptId = markers[0].getAttribute('data-content-script-id');
    if (!contentScriptId) return;

    var groups;
    try {
      groups = await webviewApi.postMessage(contentScriptId, { name: 'getNoteVariables' });
    } catch (e) {
      return;
    }
    if (!groups || typeof groups !== 'object') groups = {};

    var merged = {};
    markers.forEach(function (marker) {
      var names = [];
      try {
        names = JSON.parse(marker.getAttribute('data-import-names') || '[]');
      } catch (e) {
        names = [];
      }

      // Earlier imports take priority: apply in reverse so first wins.
      names.slice().reverse().forEach(function (name) {
        if (groups[name] && groups[name].vars) {
          for (var k in groups[name].vars) {
            if (Object.prototype.hasOwnProperty.call(groups[name].vars, k)) {
              merged[k] = groups[name].vars[k];
            }
          }
        }
      });

      var spans = names
        .map(function (name) {
          var ok = !!(groups[name] && groups[name].vars);
          var color = ok ? 'lightgreen' : 'lightcoral';
          return '<span style="color:' + color + '"> ' + escapeHtml(name) + '</span>';
        })
        .join('');
      marker.innerHTML = 'import' + spans;
      marker.setAttribute('data-nv-done', '1');
    });

    var keys = Object.keys(merged);
    if (keys.length === 0) return;

    var root = document.getElementById('rendered-md') || document.body;
    if (!root) return;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var el = node.parentElement;
        while (el) {
          if (el.classList && el.classList.contains('note-variables-import')) {
            return NodeFilter.FILTER_REJECT;
          }
          if (el.tagName === 'PRE' || el.tagName === 'CODE') {
            // allow our marker (handled above) but skip other code/pre
            if (!(el.classList && el.classList.contains('note-variables-import'))) {
              return NodeFilter.FILTER_REJECT;
            }
          }
          el = el.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    var textNodes = [];
    var current = walker.nextNode();
    while (current) {
      textNodes.push(current);
      current = walker.nextNode();
    }

    textNodes.forEach(function (node) {
      var text = node.nodeValue;
      var changed = false;
      keys.forEach(function (key) {
        if (text.indexOf(key) !== -1) {
          text = text.split(key).join(merged[key]);
          changed = true;
        }
      });
      if (changed) node.nodeValue = text;
    });
  }

  function run() {
    process().catch(function () {});
  }

  // Run now (in case the note is already rendered) and on every re-render.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  document.addEventListener('joplin-noteDidUpdate', run);
})();
