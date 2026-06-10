const globalRegExp = /^\|\s*[^|]*\s*\|\s*[^|]*\s*\|/gm;
const lineRegExp = /^\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|/;

interface NoteBody {
  body: string;
}

export const parseNote = (note: NoteBody) => {
  const { body } = note;
  const rows = body.match(globalRegExp);

  const parsedVariables: Record<string, string> = {};

  if (rows == null) return parsedVariables;

  for (const row of rows.slice(2)) {
    const match = row.match(lineRegExp);

    if (match == null || match[1] === '') continue;

    const variable = match[1].trimEnd();
    const value = match[2].trimEnd();

    if (parsedVariables[variable] != null) continue;

    parsedVariables[variable] = value;
  }

  return parsedVariables;
};
