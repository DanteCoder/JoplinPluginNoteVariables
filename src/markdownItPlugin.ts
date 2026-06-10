// IMPORTANT ARCHITECTURE NOTE:
// markdown-it render rules run at render time but produce static HTML. They
// cannot call webviewApi (that only exists in the rendered webview). So the
// rules here only EMIT markup + data attributes. The actual variable lookup
// and substitution happens in the runtime asset (noteVariablesRuntime.js),
// which runs inside the webview and uses webviewApi.postMessage to ask the
// plugin's main process for the current variables.

// Match `import name1 name2 ...` where names contain no `%` to prevent double-wrapping
const IMPORT_RE = /^import((?:\s[^%\s]+)+)$/;

interface MarkdownIt {
  renderer: {
    rules: Partial<{
      code_inline: (tokens: Token[], idx: number, options: unknown, env: unknown, self: Renderer) => string;
    }>;
  };
  utils: {
    escapeHtml: (text: string) => string;
  };
}

interface Token {
  content: string;
}

interface Renderer {
  renderToken(tokens: Token[], idx: number, options: unknown, env: unknown, self: Renderer): string;
}

export default function (context: { contentScriptId: string }) {
  const contentScriptId = context.contentScriptId;

  return {
    plugin: function (markdownIt: MarkdownIt, _options: unknown) {
      const defaultInlineCodeRender = markdownIt.renderer.rules.code_inline;

      markdownIt.renderer.rules.code_inline = function (
        tokens: Token[],
        idx: number,
        options: unknown,
        env: unknown,
        self: Renderer
      ) {
        const token = tokens[idx];

        const importMatch = token.content?.match(IMPORT_RE);

        if (importMatch == null) {
          if (defaultInlineCodeRender) {
            return defaultInlineCodeRender(tokens, idx, options, env, self);
          }

          return self.renderToken(tokens, idx, options, env, self);
        }

        const importNames = importMatch[1]
          .trimStart()
          .split(/\s+/)
          .map(i => '%' + i + '%');

        const escaped = markdownIt.utils.escapeHtml(JSON.stringify(importNames));

        return (
          `<span style="position: relative;">` +
          `<code class="inline-code note-variables-import" ` +
          `style="position: absolute; top: 0; left: 0; white-space: nowrap; background: rgba(255, 255, 255, 0.85);" ` +
          `data-content-script-id="${markdownIt.utils.escapeHtml(contentScriptId)}" ` +
          `data-import-names="${escaped}">import ${markdownIt.utils.escapeHtml(importNames.join(' '))}</code>` +
          `</span>`
        );
      };
    },
    assets: function () {
      return [{ name: 'noteVariablesRuntime.js' }];
    },
  };
}
