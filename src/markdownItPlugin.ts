let variables = updateVariables();

export default function (context) {
	return {
		plugin: function (markdownIt, _options) {
			const defaultRender = markdownIt.renderer.rules.text || function (tokens, idx, options, env, self) {
				return self.renderToken(tokens, idx, options, env, self);
			};

			markdownIt.renderer.rules.text = function (tokens, idx, options, env, self) {
				const token = tokens[idx];

				const text = <string>token.content;

				if (text.indexOf('@') === -1) return defaultRender(tokens, idx, options, env, self);

				if (localStorage.getItem('pluginNoteVariablesUpdated') === 'true') {
					localStorage.setItem('pluginNoteVariablesUpdated', 'false');
					variables = updateVariables();
				}

				const words = text.split(' ');
				let new_text = '';

				for (const word of words) {
					if (word.startsWith('@')) {
						const var_key = word.slice(1);
						const var_value = variables[var_key];

						if (typeof var_value != 'undefined') {
							new_text += var_value + ' ';
						} else {
							new_text += word + ' ';
						}
					} else {
						new_text += word + ' ';
					}
				}

				new_text = new_text.trimEnd();

				return new_text;
			};
		}
	}
}

function updateVariables() {
	const variables = JSON.parse(localStorage.getItem('noteVariables'));
	return variables;
}