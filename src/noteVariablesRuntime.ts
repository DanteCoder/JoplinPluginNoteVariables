declare const webviewApi: {
  postMessage(id: string, msg: { name: string }): Promise<unknown>;
};

const COLOR_OK = 'lightgreen';
const COLOR_MISS = 'lightcoral';

export function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isVarGroups(value: unknown): value is Record<string, { vars: Record<string, string> }> {
  return typeof value === 'object' && value !== null;
}

function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

export function isInSubstitutionScope(node: Node): boolean {
  let el = node.parentElement;

  while (el) {
    if (el.classList && el.classList.contains('note-variables-import')) return false;
    if (el.tagName === 'PRE' || el.tagName === 'CODE') return false;

    el = el.parentElement;
  }

  return true;
}

export function isWebviewApiAvailable(): boolean {
  return typeof webviewApi !== 'undefined' && !!webviewApi.postMessage;
}

export function findUnprocessedImportMarkers(): { markers: Element[]; contentScriptId: string } | null {
  const markers = Array.prototype.slice.call(
    document.querySelectorAll('code.note-variables-import:not([data-nv-done])')
  );

  if (markers.length === 0) return null;

  const contentScriptId = markers[0].getAttribute('data-content-script-id');

  if (!contentScriptId) return null;

  return { markers, contentScriptId };
}

export async function fetchVariableGroupsFromPlugin(
  contentScriptId: string
): Promise<Record<string, { vars: Record<string, string> }> | null> {
  let groups: unknown;

  try {
    groups = await webviewApi.postMessage(contentScriptId, { name: 'getNoteVariables' });
  } catch {
    return null;
  }

  if (isVarGroups(groups)) return groups;

  return {};
}

export function getImportNamesFromMarker(marker: Element): string[] {
  try {
    return JSON.parse(marker.getAttribute('data-import-names') || '[]');
  } catch {
    return [];
  }
}

export function mergeGroupVariables(
  resolvedVariables: Record<string, string>,
  importNames: string[],
  variableGroups: Record<string, { vars: Record<string, string> }>
): void {
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

export function renderImportMarkerWithStatus(
  marker: HTMLElement,
  importNames: string[],
  variableGroups: Record<string, { vars: Record<string, string> }>
): void {
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

export function collectEligibleTextNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node: Node) {
      return isInSubstitutionScope(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes: Text[] = [];
  let current = walker.nextNode();

  while (current) {
    if (isTextNode(current)) {
      textNodes.push(current);
    }

    current = walker.nextNode();
  }

  return textNodes;
}

export function replaceVariableKeysInTextNodes(textNodes: Text[], variableMap: Record<string, string>): void {
  const variableKeys = Object.keys(variableMap);

  if (variableKeys.length === 0) return;

  textNodes.forEach(node => {
    let text = node.nodeValue || '';
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

export function applyVariableSubstitutions(resolvedVariables: Record<string, string>): void {
  const variableKeys = Object.keys(resolvedVariables);

  if (variableKeys.length === 0) return;

  const noteContainer = document.getElementById('rendered-md') || document.body;

  if (!noteContainer) return;

  const textNodes = collectEligibleTextNodes(noteContainer);

  replaceVariableKeysInTextNodes(textNodes, resolvedVariables);
}

export async function processNoteVariables(): Promise<void> {
  if (!isWebviewApiAvailable()) return;

  const unprocessedMarkers = findUnprocessedImportMarkers();

  if (!unprocessedMarkers) return;

  const variableGroups = await fetchVariableGroupsFromPlugin(unprocessedMarkers.contentScriptId);

  if (variableGroups === null) return;

  const resolvedVariables: Record<string, string> = {};

  unprocessedMarkers.markers.forEach(m => {
    if (!(m instanceof HTMLElement)) return;

    const importNames = getImportNamesFromMarker(m);

    mergeGroupVariables(resolvedVariables, importNames, variableGroups);
    renderImportMarkerWithStatus(m, importNames, variableGroups);
  });

  applyVariableSubstitutions(resolvedVariables);
}

function run(): void {
  processNoteVariables().catch(function () {});
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  document.addEventListener('joplin-noteDidUpdate', run);
}
