import { describe, it, expect, vi } from 'vitest';
import { debounce } from '../src/utils/debounce';

describe('debounce', () => {
  it('calls the function after the specified timeout', async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    await new Promise(r => setTimeout(r, 150));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('cancels previous pending call when invoked again', async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced();
    debounced();
    await new Promise(r => setTimeout(r, 150));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('uses default timeout of 300ms', async () => {
    const fn = vi.fn();
    const debounced = debounce(fn);
    debounced();
    await new Promise(r => setTimeout(r, 100));
    expect(fn).not.toHaveBeenCalled();
    await new Promise(r => setTimeout(r, 250));
    expect(fn).toHaveBeenCalled();
  });
});
