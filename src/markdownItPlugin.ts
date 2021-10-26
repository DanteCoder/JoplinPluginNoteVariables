let noteVariables = <any>{vars:{}, config:{prefix_suffix:'%'}};
updateNoteVars();

export default function (context) {
	return {
		plugin: function (markdownIt, _options) {
			const defaultRender = markdownIt.renderer.rules.text || function (tokens, idx, options, env, self) {
				return self.renderToken(tokens, idx, options, env, self);
			};

			markdownIt.renderer.rules.text = function (tokens, idx, options, env, self) {
				const token = tokens[idx];

				const text = <string>token.content;

				console.log(`settings changed?: ${localStorage.getItem('pluginNoteSettingsChanged')}`)

				if (localStorage.getItem('pluginNoteSettingsChanged') === 'true') {
					localStorage.setItem('pluginNoteSettingsChanged', 'false');
					updateNoteVars();
					console.log(noteVariables);
				}

				if (text.indexOf(noteVariables.config.prefix_suffix) === -1) return defaultRender(tokens, idx, options, env, self);

				const words = text.split(noteVariables.config.prefix_suffix);

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
						new_text += noteVariables.vars[words[valid_vars[valid_vars.indexOf(i)]]];
						continue;
					}

					new_text += words[i];

					if (valid_vars.indexOf(i + 1) === -1 && i < words.length - 1) {
						new_text += noteVariables.config.prefix_suffix;
						continue;
					}
				}
				return new_text;
			};
		}
	}
}

function updateNoteVars() {
	const str_json = localStorage.getItem('noteVariables');
	console.log(str_json);
	noteVariables = JSON.parse(str_json);
}