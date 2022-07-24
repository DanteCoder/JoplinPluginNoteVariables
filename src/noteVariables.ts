import joplin from 'api';
import { ContentScriptType } from 'api/types';
import { createVariablesNote } from './utils/createVariablesNote';
import { loadVariablesNotes } from './utils/loadVariablesNotes';

export namespace noteVariables {
  /**
   * Loads all the variables from the Notes into localStorage for the MD plugin
   * @param e
   */
  const onNoteChangeHandler = async (e: any) => {
    if (e.event !== 2) return;
    const note = await joplin.data.get(['notes', e.id], { fields: ['title'] });
    if (note.title.match(/^\%[^%]*\%$/) == null) return;
    loadVariablesNotes();
  };

  export async function init() {
    await joplin.contentScripts.register(
      ContentScriptType.MarkdownItPlugin,
      'noteVariablesMD',
      './markdownItPlugin.js'
    );
    await joplin.workspace.onNoteChange(onNoteChangeHandler);
    await joplin.workspace.onNoteSelectionChange(loadVariablesNotes);

    await joplin.commands.register({
      name: 'newVariablesNote',
      label: 'Create a new variables note',
      iconName: 'fas fa-superscript',
      execute: async () => {
        const note = await joplin.workspace.selectedNote();
        createVariablesNote(note);
      },
    });

    await loadVariablesNotes();
  }
}
