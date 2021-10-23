import joplin from 'api';
import { noteVariables } from './noteVariables';

joplin.plugins.register({
	onStart: async function () {
		noteVariables.init();
	},
});
