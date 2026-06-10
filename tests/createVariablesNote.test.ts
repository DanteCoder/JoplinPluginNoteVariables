import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createVariablesNote } from '../src/utils/createVariablesNote';

vi.mock('api', () => ({
  default: {
    data: {
      post: vi.fn(),
    },
  },
}));

vi.mock('../src/utils/fetchAllNote', () => ({
  fetchAllNotes: vi.fn(),
}));

import { fetchAllNotes } from '../src/utils/fetchAllNote';
import joplin from 'api';

describe('createVariablesNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a note with incremented variable number', async () => {
    vi.mocked(fetchAllNotes).mockResolvedValue([
      { title: '%Variables1%' },
      { title: '%Variables2%' },
      { title: 'Some note' },
    ] as any);

    await createVariablesNote('folder_1');

    expect(joplin.data.post).toHaveBeenCalledWith(
      ['notes'],
      null,
      {
        body: '| variable | value |\n| -------- | ----- |\n|          |       |\n',
        title: '%Variables3%',
        parent_id: 'folder_1',
      },
    );
  });

  it('creates Variables1 when no variable notes exist', async () => {
    vi.mocked(fetchAllNotes).mockResolvedValue([
      { title: 'Some note' },
    ] as any);

    await createVariablesNote('folder_1');

    expect(joplin.data.post).toHaveBeenCalledWith(
      ['notes'],
      null,
      expect.objectContaining({ title: '%Variables1%' }),
    );
  });
});
