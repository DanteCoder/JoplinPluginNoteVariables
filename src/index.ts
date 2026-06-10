import joplin from 'api';
import { init } from './noteVariables';

joplin.plugins.register({
  onStart: async function () {
    await init();
  },
});
