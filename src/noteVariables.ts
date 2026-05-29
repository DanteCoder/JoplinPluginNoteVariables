import joplin from 'api';
import { ContentScriptType, MenuItemLocation } from 'api/types';
import { createVariablesNote } from './utils/createVariablesNote';
import { loadVariablesNotes } from './utils/loadVariablesNotes';

const CONTENT_SCRIPT_ID = 'noteVariablesMD';

export namespace noteVariables {
  /**
   * Reloads variables whenever a variables-note (title like "%Name%") changes.
   */
  const onNoteChangeHandler = async (e: any) => {
    if (e.event !== 2) return;
    const note = await joplin.data.get(['notes', e.id], { fields: ['title'] });
    if (note.title.match(/^\%[^%]*\%$/) == null) return;
    await loadVariablesNotes();
  };

  export async function init() {
    await joplin.contentScripts.register(
      ContentScriptType.MarkdownItPlugin,
      CONTENT_SCRIPT_ID,
      './markdownItPlugin.js'
    );

    // The Markdown content script runs in a sandboxed context and cannot read
    // the plugin's storage directly. It requests the current variables via
    // postMessage; we answer with the in-memory cache maintained by
    // loadVariablesNotes().
    await joplin.contentScripts.onMessage(CONTENT_SCRIPT_ID, (message: any) => {
      if (message && message.name === 'getNoteVariables') {
        return loadVariablesNotes.getCache();
      }
      return null;
    });

    await joplin.workspace.onNoteChange(onNoteChangeHandler);
    await joplin.workspace.onNoteSelectionChange(async () => {
      await loadVariablesNotes();
    });

    await joplin.commands.register({
      name: 'newVariablesNote',
      label: 'Create variables note',
      iconName: 'fas fa-superscript',
      execute: async () => {
        const folder = await joplin.workspace.selectedFolder();
        createVariablesNote(folder.id);
      },
    });
    await joplin.views.menuItems.create('Create variables note', 'newVariablesNote', MenuItemLocation.Note);

    await loadVariablesNotes();
  }
}
