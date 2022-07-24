import joplin from 'api';
import { fetchAllNotes } from './fetchAllNote';

const noteTemplate = '| variable | value |\n| -------- | ----- |\n|          |       |\n';

export const createVariablesNote = async (parent_id: string) => {
  const allNotes = await fetchAllNotes();

  const maxVariablesNum = Math.max(
    0,
    ...allNotes.map(note => {
      const match = note.title.match(/^%Variables([0-9]+)%$/);
      if (match == null) return 0;
      return parseInt(match[1]);
    })
  );
  const newTitle = `%Variables${maxVariablesNum + 1}%`;

  await joplin.data.post(['notes'], null, { body: noteTemplate, title: newTitle, parent_id });
};
