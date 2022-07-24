import joplin from 'api';
import { findVariablesNotes } from './findVariablesNotes';
import { parseNote } from './parseNote';

export const loadVariablesNotes = async () => {
  const notes = await findVariablesNotes();

  const notesData = await Promise.all(
    notes.map(async note => {
      return await joplin.data.get(['notes', note.id], { fields: ['title', 'body'] });
    })
  );

  const variableGroups: any = {};

  notesData.forEach(note => {
    if (variableGroups[note.title] != null) return;
    const vars = parseNote(note);
    variableGroups[note.title] = {
      vars,
    };
  });

  localStorage.setItem('NoteVariables', JSON.stringify(variableGroups));
  localStorage.setItem('UpdateNoteVariablesMDP', 'true');
};
