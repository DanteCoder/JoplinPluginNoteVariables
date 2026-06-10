import joplin from 'api';

export const fetchAllNotes = async () => {
  const items = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await joplin.data.get(['notes'], { page });
    items.push(...result.items);
    hasMore = result.has_more;
    page++;
  }

  return items;
};
