import { describe, it, expect } from 'vitest';
import { parseNote } from '../src/utils/parseNote';

describe('parseNote', () => {
  it('parses variables from a valid table', () => {
    const note = {
      body: [
        '| variable | value |',
        '| -------- | ----- |',
        '| myVar    | 123   |',
        '| name     | Alice |',
      ].join('\n'),
    };
    expect(parseNote(note)).toEqual({ myVar: '123', name: 'Alice' });
  });

  it('returns empty object for body with no table', () => {
    expect(parseNote({ body: 'just text' })).toEqual({});
  });

  it('returns empty object for empty body', () => {
    expect(parseNote({ body: '' })).toEqual({});
  });

  it('skips header and separator rows', () => {
    const note = {
      body: [
        '| variable | value |',
        '| -------- | ----- |',
      ].join('\n'),
    };
    expect(parseNote(note)).toEqual({});
  });

  it('first value wins when variable appears twice', () => {
    const note = {
      body: [
        '| variable | value |',
        '| -------- | ----- |',
        '| myVar    | first |',
        '| myVar    | second |',
      ].join('\n'),
    };
    expect(parseNote(note)).toEqual({ myVar: 'first' });
  });

  it('skips rows with empty variable name', () => {
    const note = {
      body: [
        '| variable | value |',
        '| -------- | ----- |',
        '|          | val   |',
        '| myVar    | 123   |',
      ].join('\n'),
    };
    expect(parseNote(note)).toEqual({ myVar: '123' });
  });

  it('trims trailing whitespace from variable names and values', () => {
    const note = {
      body: [
        '| variable | value |',
        '| -------- | ----- |',
        '| myVar    | hello   |',
      ].join('\n'),
    };
    expect(parseNote(note)).toEqual({ myVar: 'hello' });
  });
});
