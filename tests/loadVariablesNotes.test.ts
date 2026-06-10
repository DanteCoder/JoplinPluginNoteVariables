import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadVariablesNotes } from '../src/utils/loadVariablesNotes';

vi.mock('api', () => ({
  default: {
    data: {
      get: vi.fn(),
    },
  },
}));

vi.mock('../src/utils/findVariablesNotes', () => ({
  findVariablesNotes: vi.fn(),
}));

import { findVariablesNotes } from '../src/utils/findVariablesNotes';
import joplin from 'api';

describe('loadVariablesNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and caches variable groups from notes', async () => {
    vi.mocked(findVariablesNotes).mockResolvedValue([
      { id: 'note1' },
      { id: 'note2' },
    ] as any);

    vi.mocked(joplin.data.get)
      .mockResolvedValueOnce({
        title: '%Variables1%',
        body: '| variable | value |\n| -------- | ----- |\n| foo      | bar   |',
      })
      .mockResolvedValueOnce({
        title: '%Variables2%',
        body: '| variable | value |\n| -------- | ----- |\n| baz      | qux   |',
      });

    const result = await loadVariablesNotes();
    expect(result).toEqual({
      '%Variables1%': { vars: { foo: 'bar' } },
      '%Variables2%': { vars: { baz: 'qux' } },
    });
  });

  it('getCache() returns last loaded data', async () => {
    vi.mocked(findVariablesNotes).mockResolvedValue([] as any);
    const result = await loadVariablesNotes();
    expect(loadVariablesNotes.getCache()).toBe(result);
  });
});
