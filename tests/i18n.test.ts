import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { detectInitialLang, format } from '../src/i18n';
import { ja } from '../src/i18n/ja';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('dictionaries', () => {
  it('have the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ja).sort());
  });

  it('use the same placeholders in every message', () => {
    for (const key of Object.keys(ja) as (keyof typeof ja)[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(ja[key]));
    }
  });

  it('have no empty messages', () => {
    for (const [key, text] of [...Object.entries(ja), ...Object.entries(en)]) {
      expect(text.trim(), key).not.toBe('');
    }
  });
});

describe('detectInitialLang', () => {
  it('prefers the ?lang= URL parameter', () => {
    expect(detectInitialLang('?lang=en', 'ja', ['ja-JP'])).toBe('en');
    expect(detectInitialLang('?lang=ja', 'en', ['en-US'])).toBe('ja');
  });

  it('ignores unknown URL values and falls back to the stored choice', () => {
    expect(detectInitialLang('?lang=fr', 'en', ['ja-JP'])).toBe('en');
  });

  it('uses the browser language when nothing is chosen', () => {
    expect(detectInitialLang('', null, ['ja-JP', 'en-US'])).toBe('ja');
    expect(detectInitialLang('', null, ['en-US', 'ja'])).toBe('ja');
    expect(detectInitialLang('', null, ['de-DE', 'en-US'])).toBe('en');
    expect(detectInitialLang('', null, [])).toBe('en');
  });
});

describe('format', () => {
  it('replaces known placeholders and keeps unknown ones', () => {
    expect(format('{a} of {b}', { a: 1, b: 'two' })).toBe('1 of two');
    expect(format('{a} {missing}', { a: 'x' })).toBe('x {missing}');
    expect(format('no params')).toBe('no params');
  });
});
