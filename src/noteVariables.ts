import joplin from 'api';
import { ContentScriptType, MenuItemLocation } from 'api/types';
import { createVariablesNote } from './utils/createVariablesNote';
import { loadVariablesNotes } from './utils/loadVariablesNotes';

interface NoteChangeEvent {
  id: string;
  event: number;
}

const onNoteChangeHandler = async (e: NoteChangeEvent) => {
  if (e.event !== 2) return;

  const note = await joplin.data.get(['notes', e.id], { fields: ['title'] });

  if (note.title.match(/^%[^%]*%$/) == null) return;

  loadVariablesNotes();
};

export async function init() {
  await joplin.contentScripts.register(ContentScriptType.MarkdownItPlugin, 'noteVariablesMD', './markdownItPlugin.js');
  await joplin.workspace.onNoteChange(onNoteChangeHandler);
  await joplin.workspace.onNoteSelectionChange(loadVariablesNotes);

  await joplin.commands.register({
    name: 'newVariablesNote',
    label: 'Create variables note',
    iconName: 'fas fa-superscript',
    execute: async () => {
      const folder = await joplin.workspace.selectedFolder();
      createVariablesNote(folder.id);
    },
  });
  await joplin.views.menuItems.create('Create variables vote', 'newVariablesNote', MenuItemLocation.Note);

  await loadVariablesNotes();
}
