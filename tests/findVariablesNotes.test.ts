import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findVariablesNotes } from '../src/utils/findVariablesNotes';

vi.mock('../src/utils/fetchAllNote', () => ({
  fetchAllNotes: vi.fn(),
}));

import { fetchAllNotes } from '../src/utils/fetchAllNote';

describe('findVariablesNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns notes with %...% title pattern', async () => {
    vi.mocked(fetchAllNotes).mockResolvedValue([
      { id: '1', title: '%Variables1%' },
      { id: '2', title: 'Normal Note' },
      { id: '3', title: '%Config%' },
    ] as any);

    const result = await findVariablesNotes();
    expect(result).toEqual([
      { id: '1', title: '%Variables1%' },
      { id: '3', title: '%Config%' },
    ]);
  });

  it('returns empty array when no notes match', async () => {
    vi.mocked(fetchAllNotes).mockResolvedValue([
      { id: '1', title: 'Note' },
    ] as any);

    expect(await findVariablesNotes()).toEqual([]);
  });

  it('returns empty array when no notes exist', async () => {
    vi.mocked(fetchAllNotes).mockResolvedValue([]);
    expect(await findVariablesNotes()).toEqual([]);
  });
});
