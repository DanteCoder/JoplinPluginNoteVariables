(function () {
  const COLOR_OK = 'lightgreen';
  const COLOR_MISS = 'lightcoral';

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function isInSubstitutionScope(textNode) {
    let el = textNode.parentElement;

    while (el) {
      if (el.classList && el.classList.contains('note-variables-import')) return false;
      if (el.tagName === 'PRE' || el.tagName === 'CODE') return false;

      el = el.parentElement;
    }

    return true;
  }

  function isWebviewApiAvailable() {
    return typeof webviewApi !== 'undefined' && !!webviewApi.postMessage;
  }

  function findUnprocessedImportMarkers() {
    const markers = Array.prototype.slice.call(
      document.querySelectorAll('code.note-variables-import:not([data-nv-done])')
    );

    if (markers.length === 0) return null;

    const contentScriptId = markers[0].getAttribute('data-content-script-id');

    if (!contentScriptId) return null;

    return { markers, contentScriptId };
  }

  async function fetchVariableGroupsFromPlugin(contentScriptId) {
    let groups;

    try {
      groups = await webviewApi.postMessage(contentScriptId, { name: 'getNoteVariables' });
    } catch {
      return null;
    }

    if (!groups || typeof groups !== 'object') return {};

    return groups;
  }

  function getImportNamesFromMarker(marker) {
    try {
      return JSON.parse(marker.getAttribute('data-import-names') || '[]');
    } catch {
      return [];
    }
  }

  // Earlier imports take priority: apply in reverse so first wins.
  function mergeGroupVariables(resolvedVariables, importNames, variableGroups) {
    importNames
      .slice()
      .reverse()
      .forEach(importName => {
        if (variableGroups[importName] && variableGroups[importName].vars) {
          for (const k in variableGroups[importName].vars) {
            if (Object.prototype.hasOwnProperty.call(variableGroups[importName].vars, k)) {
              resolvedVariables[k] = variableGroups[importName].vars[k];
            }
          }
        }
      });
  }

  function renderImportMarkerWithStatus(marker, importNames, variableGroups) {
    const allOk = importNames.every(n => variableGroups[n] && variableGroups[n].vars);

    if (allOk) {
      marker.style.display = 'none';
      marker.setAttribute('data-nv-done', '1');

      return;
    }

    const variableSpansHtml = importNames
      .map(importName => {
        const hasVariables = !!(variableGroups[importName] && variableGroups[importName].vars);
        const color = hasVariables ? COLOR_OK : COLOR_MISS;

        return '<span style="color:' + color + '"> ' + escapeHtml(importName) + '</span>';
      })
      .join('');

    marker.innerHTML = 'import' + variableSpansHtml;
    marker.setAttribute('data-nv-done', '1');
  }

  function collectEligibleTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        return isInSubstitutionScope(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    const textNodes = [];
    let current = walker.nextNode();

    while (current) {
      textNodes.push(current);
      current = walker.nextNode();
    }

    return textNodes;
  }

  function replaceVariableKeysInTextNodes(textNodes, variableMap) {
    const variableKeys = Object.keys(variableMap);

    if (variableKeys.length === 0) return;

    textNodes.forEach(node => {
      let text = node.nodeValue;
      let changed = false;

      variableKeys.forEach(key => {
        if (text.indexOf(key) !== -1) {
          text = text.split(key).join(variableMap[key]);
          changed = true;
        }
      });

      if (changed) node.nodeValue = text;
    });
  }

  function applyVariableSubstitutions(resolvedVariables) {
    const variableKeys = Object.keys(resolvedVariables);

    if (variableKeys.length === 0) return;

    const noteContainer = document.getElementById('rendered-md') || document.body;

    if (!noteContainer) return;

    const textNodes = collectEligibleTextNodes(noteContainer);

    replaceVariableKeysInTextNodes(textNodes, resolvedVariables);
  }

  async function processNoteVariables() {
    if (!isWebviewApiAvailable()) return;

    const unprocessedMarkers = findUnprocessedImportMarkers();

    if (!unprocessedMarkers) return;

    const variableGroups = await fetchVariableGroupsFromPlugin(unprocessedMarkers.contentScriptId);

    if (variableGroups === null) return;

    const resolvedVariables = {};

    unprocessedMarkers.markers.forEach(marker => {
      const importNames = getImportNamesFromMarker(marker);

      mergeGroupVariables(resolvedVariables, importNames, variableGroups);
      renderImportMarkerWithStatus(marker, importNames, variableGroups);
    });

    applyVariableSubstitutions(resolvedVariables);
  }

  function run() {
    processNoteVariables().catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  document.addEventListener('joplin-noteDidUpdate', run);
})();
