let noteVariables = <any>{ vars: {} };
let fence = '%';
syncWithPlugin();

export default function (context) {
  return {
    plugin: function (markdownIt, _options) {
      const defaultRender =
        markdownIt.renderer.rules.text ||
        function (tokens, idx, options, env, self) {
          return self.renderToken(tokens, idx, options, env, self);
        };

      markdownIt.renderer.rules.text = function (tokens, idx, options, env, self) {
        const token = tokens[idx];

        const text = <string>token.content;

        if (localStorage.getItem('pluginNoteVariablesUpdate') === 'true') {
          localStorage.setItem('pluginNoteVariablesUpdate', 'false');
          syncWithPlugin();
          console.log('synced with plugin');
          console.log(noteVariables);
        }

        if (text.indexOf(fence) === -1) return defaultRender(tokens, idx, options, env, self);

        const words = text.split(fence);

        const valid_vars = [];
        for (let i = 0; i < words.length; i++) {
          if (Object.keys(noteVariables.vars).indexOf(words[i]) !== -1) {
            valid_vars.push(i);
          }
        }

        if (valid_vars.length === 0) return text;

        let new_text = '';
        for (let i = 0; i < words.length; i++) {
          if (valid_vars.indexOf(i - 1) === -1 && valid_vars.indexOf(i) !== -1 && valid_vars.indexOf(i + 1) === -1) {
            new_text += noteVariables.vars[words[valid_vars[valid_vars.indexOf(i)]]].value;
            continue;
          }

          new_text += words[i];

          if (valid_vars.indexOf(i + 1) === -1 && i < words.length - 1) {
            new_text += fence;
            continue;
          }
        }
        return new_text;
      };
    },
  };
}

function syncWithPlugin() {
  const str_json = localStorage.getItem('mdiVariables');
  noteVariables = JSON.parse(str_json);
  fence = localStorage.getItem('noteVariablesFence');
  console.log('updated markdownit with plugin:');
  console.log(noteVariables);
  console.log(fence);
}
