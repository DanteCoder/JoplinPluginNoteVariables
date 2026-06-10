import joplin from 'api';
import { ContentScriptType, MenuItemLocation } from 'api/types';
import { createVariablesNote } from './utils/createVariablesNote';
import { loadVariablesNotes } from './utils/loadVariablesNotes';

const CONTENT_SCRIPT_ID = 'noteVariablesMD';

interface NoteChangeEvent {
  event: number;
  id: string;
}

const onNoteChangeHandler = async (e: NoteChangeEvent) => {
  if (e.event !== 2) return;

  const note = await joplin.data.get(['notes', e.id], { fields: ['title'] });

  if (note.title.match(/^\%[^%]*\%$/) == null) return;

  await loadVariablesNotes();
};

export async function init() {
  await joplin.contentScripts.register(ContentScriptType.MarkdownItPlugin, CONTENT_SCRIPT_ID, './markdownItPlugin.js');

  await joplin.contentScripts.onMessage(CONTENT_SCRIPT_ID, (message: unknown) => {
    if (message && typeof message === 'object' && 'name' in message && message.name === 'getNoteVariables') {
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
