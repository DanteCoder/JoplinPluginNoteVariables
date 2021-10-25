let variables = <object>{};
let prefix_sufix = <string>'';
updateVariables();
updateSettings();

export default function (context) {
	return {
		plugin: function (markdownIt, _options) {
			const defaultRender = markdownIt.renderer.rules.text || function (tokens, idx, options, env, self) {
				return self.renderToken(tokens, idx, options, env, self);
			};

			markdownIt.renderer.rules.text = function (tokens, idx, options, env, self) {
				const token = tokens[idx];

				const text = <string>token.content;

				if (text.indexOf(prefix_sufix) === -1) return defaultRender(tokens, idx, options, env, self);

				if (localStorage.getItem('pluginNoteVariablesUpdated') === 'true') {
					localStorage.setItem('pluginNoteVariablesUpdated', 'false');
					updateVariables();
				}

				if (localStorage.getItem('pluginNoteSettingsChanged') === 'true') {
					localStorage.setItem('pluginNoteSettingsChanged', 'false');
					updateSettings();
				}

				const words = text.split(prefix_sufix);

				const valid_vars = [];
				for (let i = 0; i < words.length; i++) {
					if (Object.keys(variables).indexOf(words[i]) !== -1) {
						valid_vars.push(i);
					}
				}

				if (valid_vars.length === 0) return text;

				let new_text = '';
				for (let i = 0; i < words.length; i++) {

					if (valid_vars.indexOf(i - 1) === -1 && valid_vars.indexOf(i) !== -1 && valid_vars.indexOf(i + 1) === -1) {
						new_text += variables[words[valid_vars[valid_vars.indexOf(i)]]];
						continue;
					}

					new_text += words[i];

					if (valid_vars.indexOf(i + 1) === -1 && i < words.length - 1) {
						new_text += prefix_sufix;
						continue;
					}
				}
				return new_text;
			};
		}
	}
}

function updateVariables() {
	variables = JSON.parse(localStorage.getItem('noteVariables'));
}

function updateSettings() {
	prefix_sufix = localStorage.getItem('variablePrefixSufix');
	console.log(`new prefix: ${prefix_sufix}`);
}