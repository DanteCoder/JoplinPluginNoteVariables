import { fetchAllNotes } from './fetchAllNote';

export const findVariablesNotes = async () => {
  const notes = await fetchAllNotes();

  return notes.filter(note => note.title.match(/^%[^%]*%$/) != null);
};
