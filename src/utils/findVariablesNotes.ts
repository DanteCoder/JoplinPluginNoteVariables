import { fetchAllNotes } from './fetchAllNote';

export const findVariablesNotes = async () => {
  const notes = await fetchAllNotes();
  return notes.filter(note => (note.title as string).match(/^\%[^%]*\%$/) != null);
};
