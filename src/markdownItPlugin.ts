// Markdown-It content script for Note Variables.
//
// IMPORTANT ARCHITECTURE NOTE:
// markdown-it render rules run at render time but produce static HTML. They
// cannot call webviewApi (that only exists in the rendered webview). So the
// rules here only EMIT markup + data attributes. The actual variable lookup
// and substitution happens in the runtime asset (noteVariablesRuntime.js),
// which runs inside the webview and uses webviewApi.postMessage to ask the
// plugin's main process for the current variables.

export default function (context) {
  const contentScriptId = context.contentScriptId;

  return {
    plugin: function (markdownIt, _options) {
      const defaultInlineCodeRender =
        markdownIt.renderer.rules.code_inline ||
        function (tokens, idx, options, env, self) {
          return self.renderToken(tokens, idx, options, env, self);
        };

      markdownIt.renderer.rules.code_inline = function (tokens, idx, options, env, self) {
        const token = tokens[idx];

        const importMatch = (token.content as string)?.match(/^import((?:\s[^%\s]+)+)$/);
        if (importMatch == null) {
          return defaultInlineCodeRender(tokens, idx, options, env, self);
        }

        const importNames = importMatch[1]
          .trimStart()
          .split(' ')
          .map(i => '%' + i + '%');

        // Emit a marker the runtime can find. The runtime fills in colors and
        // performs the text substitution after fetching variables.
        const escaped = markdownIt.utils.escapeHtml(JSON.stringify(importNames));
        return (
          `<code class="inline-code note-variables-import" ` +
          `data-content-script-id="${markdownIt.utils.escapeHtml(contentScriptId)}" ` +
          `data-import-names="${escaped}">import ${markdownIt.utils.escapeHtml(importNames.join(' '))}</code>`
        );
      };
    },
    assets: function () {
      return [{ name: 'noteVariablesRuntime.js' }];
    },
  };
}
