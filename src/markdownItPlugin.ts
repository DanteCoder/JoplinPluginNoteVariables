import { debounce } from './utils/debounce';

let importedVariables: { [key: string]: string } | null = null;
let noteVariables: { [note: string]: { vars: { [key: string]: string } } } = {};

interface Token {
  content: string;
}

type RenderRule = (
  tokens: Token[],
  idx: number,
  options: unknown,
  env: unknown,
  self: { renderToken: (...args: unknown[]) => string }
) => string;

interface MarkdownItInstance {
  renderer: {
    rules: {
      text?: RenderRule;
      code_inline?: RenderRule;
      [key: string]: unknown;
    };
  };
}

export default function (_context: unknown) {
  return {
    plugin: function (markdownIt: MarkdownItInstance, _options: unknown) {
      const defaultRender =
        markdownIt.renderer.rules.text ||
        function (
          tokens: Token[],
          idx: number,
          options: unknown,
          env: unknown,
          self: { renderToken: (...args: unknown[]) => string }
        ) {
          return self.renderToken(tokens, idx, options, env, self);
        };

      const defaultInlineCodeRender =
        markdownIt.renderer.rules.code_inline ||
        function (
          tokens: Token[],
          idx: number,
          options: unknown,
          env: unknown,
          self: { renderToken: (...args: unknown[]) => string }
        ) {
          return self.renderToken(tokens, idx, options, env, self);
        };

      /**
       * Searchs for Note Variable imports
       */
      markdownIt.renderer.rules.code_inline = function (
        tokens: Token[],
        idx: number,
        options: unknown,
        env: unknown,
        self: { renderToken: (...args: unknown[]) => string }
      ) {
        const token = tokens[idx];

        const importMatch = token.content?.match(/^import((?:\s[^%\s]+)+)$/);
        const imports = importMatch
          ? importMatch[1]
              .trimStart()
              .split(' ')
              .map(i => '%' + i + '%')
          : [];

        if (importMatch == null) return defaultInlineCodeRender(tokens, idx, options, env, self);

        noteVariables = fetchLocalStoargeVariables();

        const importResult = mergeImports(imports);
        importedVariables = importResult.merged;

        const newText =
          '<code class="inline-code">import' +
          imports
            .map(value => {
              const successImport = importResult.validImports.includes(value);

              return `<span style="color:${successImport ? 'lightgreen' : 'lightcoral'}" > ${value}</span>`;
            })
            .join('') +
          '</code>';

        return newText;
      };

      /**
       * Replaces the imported variables into the text
       */
      markdownIt.renderer.rules.text = function (
        tokens: Token[],
        idx: number,
        options: unknown,
        env: unknown,
        self: { renderToken: (...args: unknown[]) => string }
      ) {
        if (importedVariables == null) return defaultRender(tokens, idx, options, env, self);

        const token = tokens[idx];
        const text = token.content;

        // Replace the variables in the text
        const newText = replaceText(text, importedVariables);
        resetImportedVariables();

        return newText;
      };
    },
  };
}

/**
 * Fetch the note variables from local storage.
 * @returns The Note Variables from local storage
 */
function fetchLocalStoargeVariables() {
  const jsonStrong = localStorage.getItem('NoteVariables');

  if (jsonStrong == null) return {};

  const noteVariables = JSON.parse(jsonStrong);

  return noteVariables;
}

/**
 * Merges the Note Variables into a single object to use in the MD renderer
 * @param imports
 * @returns The merged variables and the valid imports
 */
function mergeImports(imports: string[]) {
  const result: { merged: Record<string, string>; validImports: string[] } = { merged: {}, validImports: [] };

  // The reverse is to give the first imports variables more priority
  [...imports].reverse().forEach(importValue => {
    if (noteVariables[importValue] == null) return;

    result.validImports.push(importValue);
    result.merged = {
      ...result.merged,
      ...noteVariables[importValue].vars,
    };
  });

  return result;
}

/**
 * Resets the imported variables.
 */
const resetImportedVariables = debounce(() => {
  importedVariables = null;
}, 500);

/**
 * Replaces all the provided variables in a string
 * @param text
 * @param variables
 * @returns The replaced text
 */
function replaceText(text: string, variables: { [key: string]: string }): string {
  if (text.length === 0) return '';

  const varKeys = Object.keys(variables);

  if (varKeys.length === 0) return text;

  const variablesLeft = { ...variables };

  for (const key of varKeys) {
    delete variablesLeft[key];

    const matchIndex = text.indexOf(key);

    if (matchIndex === -1) continue;

    const textSplit = text.split(key).map(splitText => {
      return replaceText(splitText, variablesLeft);
    });

    return textSplit.join(variables[key]);
  }

  return text;
}
