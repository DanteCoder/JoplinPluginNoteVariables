import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllNotes } from '../src/utils/fetchAllNote';

vi.mock('api', () => ({
  default: {
    data: {
      get: vi.fn(),
    },
  },
}));

import joplin from 'api';

describe('fetchAllNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all pages of notes', async () => {
    vi.mocked(joplin.data.get)
      .mockResolvedValueOnce({ items: [{ id: '1' }], has_more: true })
      .mockResolvedValueOnce({ items: [{ id: '2' }], has_more: false });

    const result = await fetchAllNotes();
    expect(result).toEqual([{ id: '1' }, { id: '2' }]);
    expect(joplin.data.get).toHaveBeenCalledTimes(2);
  });

  it('handles single page', async () => {
    vi.mocked(joplin.data.get).mockResolvedValueOnce({
      items: [{ id: '1' }, { id: '2' }],
      has_more: false,
    });

    const result = await fetchAllNotes();
    expect(result).toEqual([{ id: '1' }, { id: '2' }]);
    expect(joplin.data.get).toHaveBeenCalledOnce();
  });
});
