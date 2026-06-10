import joplin from 'api';
import { findVariablesNotes } from './findVariablesNotes';
import { parseNote } from './parseNote';

type VariableGroups = { [note: string]: { vars: { [key: string]: string } } };

// In-memory cache of the most recently loaded variable groups. The Markdown
// content script reads this via postMessage (see noteVariables.ts), replacing
// the old localStorage bridge that no longer works across Joplin's isolated
// rendering context.
let cache: VariableGroups = {};

export const loadVariablesNotes = async () => {
  const notes = await findVariablesNotes();

  const notesData = await Promise.all(
    notes.map(async note => {
      return await joplin.data.get(['notes', note.id], { fields: ['title', 'body'] });
    })
  );

  const variableGroups: VariableGroups = {};

  notesData.forEach(note => {
    if (variableGroups[note.title] != null) return;

    const vars = parseNote(note);
    variableGroups[note.title] = {
      vars,
    };
  });

  cache = variableGroups;

  return cache;
};

// Synchronous accessor used by the content-script message handler.
loadVariablesNotes.getCache = (): VariableGroups => cache;
