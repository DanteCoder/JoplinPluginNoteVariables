import joplin from 'api';

const noteTemplate = '| variable | value |\n| -------- | ----- |\n|          |       |\n';

export const createVariablesNote = async (selectedNote: any) => {
  const newTitle = `%Variables%`;
  await joplin.data.post(['notes'], null, { body: noteTemplate, title: newTitle, parent_id: selectedNote.parent_id });
};
