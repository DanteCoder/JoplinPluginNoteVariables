// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  escapeHtml,
  isInSubstitutionScope,
  findUnprocessedImportMarkers,
  fetchVariableGroupsFromPlugin,
  getImportNamesFromMarker,
  mergeGroupVariables,
  renderImportMarkerWithStatus,
  collectEligibleTextNodes,
  replaceVariableKeysInTextNodes,
  processNoteVariables,
} from '../src/noteVariablesRuntime';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('escapeHtml', () => {
  it('escapes & < > "', () => {
    expect(escapeHtml('<>&"')).toBe('&lt;&gt;&amp;&quot;');
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('passes through normal text', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('mergeGroupVariables', () => {
  it('merges variables from import groups', () => {
    const resolved: Record<string, string> = {};
    mergeGroupVariables(resolved, ['%A%'], {
      '%A%': { vars: { x: '1', y: '2' } },
    });
    expect(resolved).toEqual({ x: '1', y: '2' });
  });

  it('later imports do not override earlier ones (reverse iteration)', () => {
    const resolved: Record<string, string> = {};
    mergeGroupVariables(resolved, ['%A%', '%B%'], {
      '%A%': { vars: { x: 'fromA' } },
      '%B%': { vars: { x: 'fromB' } },
    });
    expect(resolved).toEqual({ x: 'fromA' });
  });

  it('handles missing variable groups gracefully', () => {
    const resolved: Record<string, string> = {};
    mergeGroupVariables(resolved, ['%NonExistent%'], {});
    expect(resolved).toEqual({});
  });

  it('handles empty import names', () => {
    const resolved: Record<string, string> = { existing: 'val' };
    mergeGroupVariables(resolved, [], {});
    expect(resolved).toEqual({ existing: 'val' });
  });
});

describe('replaceVariableKeysInTextNodes', () => {
  it('replaces variable keys in text nodes', () => {
    const text = document.createTextNode('Hello %name%');
    replaceVariableKeysInTextNodes([text], { '%name%': 'Alice' });
    expect(text.nodeValue).toBe('Hello Alice');
  });

  it('does nothing when variable map is empty', () => {
    const text = document.createTextNode('Hello %name%');
    replaceVariableKeysInTextNodes([text], {});
    expect(text.nodeValue).toBe('Hello %name%');
  });

  it('replaces multiple different keys', () => {
    const text = document.createTextNode('%a% and %b%');
    replaceVariableKeysInTextNodes([text], { '%a%': '1', '%b%': '2' });
    expect(text.nodeValue).toBe('1 and 2');
  });

  it('does not modify text with no matching keys', () => {
    const text = document.createTextNode('no variables here');
    replaceVariableKeysInTextNodes([text], { '%x%': 'y' });
    expect(text.nodeValue).toBe('no variables here');
  });
});

describe('getImportNamesFromMarker', () => {
  it('parses import names from data-import-names attribute', () => {
    const el = document.createElement('code');
    el.setAttribute('data-import-names', '["%var1%","%var2%"]');
    expect(getImportNamesFromMarker(el)).toEqual(['%var1%', '%var2%']);
  });

  it('returns empty array for missing attribute', () => {
    const el = document.createElement('code');
    expect(getImportNamesFromMarker(el)).toEqual([]);
  });

  it('returns empty array for invalid JSON', () => {
    const el = document.createElement('code');
    el.setAttribute('data-import-names', '{broken');
    expect(getImportNamesFromMarker(el)).toEqual([]);
  });
});

describe('isInSubstitutionScope', () => {
  it('accepts text nodes not inside PRE or CODE', () => {
    const div = document.createElement('div');
    const text = document.createTextNode('hello');
    div.appendChild(text);
    document.body.appendChild(div);
    expect(isInSubstitutionScope(text)).toBe(true);
  });

  it('rejects text inside PRE element', () => {
    const pre = document.createElement('pre');
    const text = document.createTextNode('hello');
    pre.appendChild(text);
    document.body.appendChild(pre);
    expect(isInSubstitutionScope(text)).toBe(false);
  });

  it('rejects text inside CODE element', () => {
    const code = document.createElement('code');
    const text = document.createTextNode('hello');
    code.appendChild(text);
    document.body.appendChild(code);
    expect(isInSubstitutionScope(text)).toBe(false);
  });

  it('rejects text inside note-variables-import element', () => {
    const span = document.createElement('span');
    span.classList.add('note-variables-import');
    const text = document.createTextNode('hello');
    span.appendChild(text);
    document.body.appendChild(span);
    expect(isInSubstitutionScope(text)).toBe(false);
  });
});

describe('renderImportMarkerWithStatus', () => {
  it('hides marker when all groups are found', () => {
    const marker = document.createElement('code');
    marker.classList.add('note-variables-import');
    renderImportMarkerWithStatus(marker, ['%A%'], {
      '%A%': { vars: { x: '1' } },
    });
    expect(marker.style.display).toBe('none');
    expect(marker.getAttribute('data-nv-done')).toBe('1');
  });

  it('shows missing groups with error color', () => {
    const marker = document.createElement('code');
    marker.innerHTML = 'original';
    renderImportMarkerWithStatus(marker, ['%A%', '%Missing%'], {
      '%A%': { vars: { x: '1' } },
    });
    expect(marker.innerHTML).toContain('color:lightcoral');
    expect(marker.innerHTML).toContain('%Missing%');
    expect(marker.getAttribute('data-nv-done')).toBe('1');
  });
});

describe('findUnprocessedImportMarkers', () => {
  it('returns null when no markers exist', () => {
    expect(findUnprocessedImportMarkers()).toBeNull();
  });

  it('finds markers with content-script-id', () => {
    const marker = document.createElement('code');
    marker.classList.add('note-variables-import');
    marker.setAttribute('data-content-script-id', 'myScript');
    document.body.appendChild(marker);

    const result = findUnprocessedImportMarkers();
    expect(result).not.toBeNull();
    expect(result!.markers).toHaveLength(1);
    expect(result!.contentScriptId).toBe('myScript');
  });

  it('ignores markers already processed (data-nv-done)', () => {
    const marker = document.createElement('code');
    marker.classList.add('note-variables-import');
    marker.setAttribute('data-content-script-id', 'myScript');
    marker.setAttribute('data-nv-done', '1');
    document.body.appendChild(marker);

    const result = findUnprocessedImportMarkers();
    // function filters via CSS :not([data-nv-done]) selector
    if (result !== null) {
      const actualDone = marker.getAttribute('data-nv-done');
      expect(actualDone).toBe('1');
    }
    expect(result).toBeNull();
  });
});

describe('collectEligibleTextNodes', () => {
  it('collects text nodes not inside PRE or CODE', () => {
    const div = document.createElement('div');
    div.innerHTML = '<p>hello <span>world</span></p>';
    document.body.appendChild(div);

    const nodes = collectEligibleTextNodes(document.body);
    expect(nodes.length).toBeGreaterThanOrEqual(2);
    expect(nodes.some(n => n.nodeValue === 'hello ')).toBe(true);
    expect(nodes.some(n => n.nodeValue === 'world')).toBe(true);
  });

  it('excludes text nodes inside PRE', () => {
    document.body.innerHTML = '<div><pre>code block</pre><p>normal</p></div>';
    const nodes = collectEligibleTextNodes(document.body);
    expect(nodes.some(n => n.nodeValue?.includes('code block'))).toBe(false);
    expect(nodes.some(n => n.nodeValue === 'normal')).toBe(true);
  });
});

describe('fetchVariableGroupsFromPlugin', () => {
  it('returns parsed groups from webviewApi', async () => {
    const postMessage = vi.fn().mockResolvedValue({
      '%A%': { vars: { x: '1' } },
    });

    vi.stubGlobal('webviewApi', { postMessage });

    const result = await fetchVariableGroupsFromPlugin('scriptId');
    expect(result).toEqual({ '%A%': { vars: { x: '1' } } });
    expect(postMessage).toHaveBeenCalledWith('scriptId', {
      name: 'getNoteVariables',
    });

    vi.unstubAllGlobals();
  });

  it('returns null when webviewApi throws', async () => {
    vi.stubGlobal('webviewApi', {
      postMessage: vi.fn().mockRejectedValue(new Error('fail')),
    });

    const result = await fetchVariableGroupsFromPlugin('scriptId');
    expect(result).toBeNull();

    vi.unstubAllGlobals();
  });
});

describe('processNoteVariables', () => {
  it('returns early when webviewApi is not available', async () => {
    vi.stubGlobal('webviewApi', undefined);
    await expect(processNoteVariables()).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });

  it('replaces variable keys in rendered-md container', async () => {
    document.body.innerHTML = '<div id="rendered-md">Hello %name% <code>ignore this</code></div>';

    const marker = document.createElement('code');
    marker.classList.add('note-variables-import');
    marker.setAttribute('data-content-script-id', 'testScript');
    marker.setAttribute('data-import-names', '["%A%"]');
    document.body.appendChild(marker);

    vi.stubGlobal('webviewApi', {
      postMessage: vi.fn().mockResolvedValue({
        '%A%': { vars: { '%name%': 'Alice' } },
      }),
    });

    await processNoteVariables();

    const container = document.getElementById('rendered-md');
    expect(container!.innerHTML).toContain('Hello Alice');
    expect(container!.innerHTML).toContain('ignore this');
    expect(marker.style.display).toBe('none');

    vi.unstubAllGlobals();
  });
});
