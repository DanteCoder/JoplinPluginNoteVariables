import { describe, it, expect, vi } from 'vitest';
import pluginFactory from '../src/markdownItPlugin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

function createMockMarkdownIt() {
  const defaultRender = vi.fn<AnyFn>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    renderer: { rules: { code_inline: defaultRender } },
    utils: {
      escapeHtml: (s: string) =>
        String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    },
  } as any;
}

function createMockSelf() {
  return {
    renderToken: vi.fn(() => '<code>fallback</code>'),
  };
}

describe('markdownItPlugin', () => {
  const contentScriptId = 'testScriptId';
  const plugin = pluginFactory({ contentScriptId });
  const { plugin: mdPlugin } = plugin;

  it('passes normal inline code to the default renderer', () => {
    const md = createMockMarkdownIt();
    const self = createMockSelf();
    const defaultRender = md.renderer.rules.code_inline;

    mdPlugin(md, {});

    const tokens = [{ content: 'some code' }];
    md.renderer.rules.code_inline(tokens, 0, {}, {}, self);

    expect(defaultRender).toHaveBeenCalledWith(tokens, 0, {}, {}, self);
  });

  it('returns fallback when no default renderer and no import match', () => {
    const md = createMockMarkdownIt();
    const self = createMockSelf();

    md.renderer.rules.code_inline = undefined;
    mdPlugin(md, {});

    const tokens = [{ content: 'code' }];
    const result = md.renderer.rules.code_inline(tokens, 0, {}, {}, self);

    expect(result).toBe('<code>fallback</code>');
    expect(self.renderToken).toHaveBeenCalledWith(tokens, 0, {}, {}, self);
  });

  it('renders import names as wrapped %names% in data attribute', () => {
    const md = createMockMarkdownIt();
    const self = createMockSelf();

    mdPlugin(md, {});

    const tokens = [{ content: 'import var1 var2' }];
    const result = md.renderer.rules.code_inline(tokens, 0, {}, {}, self);

    expect(result).toContain('data-import-names');
    expect(result).toContain('&quot;%var1%&quot;,&quot;%var2%&quot;');
    expect(result).toContain('data-content-script-id="testScriptId"');
    expect(result).toContain('class="inline-code note-variables-import"');
    expect(result).toContain('import %var1% %var2%');
  });

  it('renders single import name', () => {
    const md = createMockMarkdownIt();
    const self = createMockSelf();

    mdPlugin(md, {});

    const tokens = [{ content: 'import myVar' }];
    const result = md.renderer.rules.code_inline(tokens, 0, {}, {}, self);

    expect(result).toContain('&quot;%myVar%&quot;');
    expect(result).toContain('import %myVar%');
  });

  it('does not match import names containing % (prevents double-wrapping)', () => {
    const md = createMockMarkdownIt();
    const self = createMockSelf();

    const defaultRender = vi.fn(() => '<code>passthrough</code>');
    md.renderer.rules.code_inline = defaultRender;
    mdPlugin(md, {});

    const tokens = [{ content: 'import %alreadyWrapped%' }];
    const result = md.renderer.rules.code_inline(tokens, 0, {}, {}, self);

    expect(result).toBe('<code>passthrough</code>');
  });

  it('does not match bare import keyword with no names', () => {
    const md = createMockMarkdownIt();
    const self = createMockSelf();

    const defaultRender = vi.fn(() => '<code>passthrough</code>');
    md.renderer.rules.code_inline = defaultRender;
    mdPlugin(md, {});

    const tokens = [{ content: 'import' }];
    const result = md.renderer.rules.code_inline(tokens, 0, {}, {}, self);

    expect(result).toBe('<code>passthrough</code>');
  });

  it('does not match text that is not an import', () => {
    const md = createMockMarkdownIt();
    const self = createMockSelf();

    const defaultRender = vi.fn(() => '<code>passthrough</code>');
    md.renderer.rules.code_inline = defaultRender;
    mdPlugin(md, {});

    const tokens = [{ content: 'not an import' }];
    const result = md.renderer.rules.code_inline(tokens, 0, {}, {}, self);

    expect(result).toBe('<code>passthrough</code>');
  });

  it('escapes special characters in import names', () => {
    const md = createMockMarkdownIt();
    const self = createMockSelf();

    mdPlugin(md, {});

    const tokens = [{ content: 'import <script>' }];
    const result = md.renderer.rules.code_inline(tokens, 0, {}, {}, self);

    expect(result).toContain('&quot;%&lt;script&gt;%&quot;');
    expect(result).toContain('import %&lt;script&gt;%');
  });

  it('assets returns the runtime JS file', () => {
    const assets = plugin.assets();
    expect(assets).toEqual([{ name: 'noteVariablesRuntime.js' }]);
  });
});
