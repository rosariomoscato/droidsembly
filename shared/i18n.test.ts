import { describe, expect, it } from 'vitest';
import { communicationInstructions, italian, languageOf, languageTag, translate, voiceSample } from './i18n.ts';
import { SAMPLE_LINE } from './speech.ts';
import { speechVoice } from './speechLanguage.ts';

describe('office language', () => {
  it('defaults older and invalid settings to English', () => {
    for (const value of [undefined, null, '', 'de', 'IT', {}]) {
      expect(languageOf(value)).toBe('en');
      expect(languageTag(value)).toBe('en-US');
    }
    expect(languageTag('it')).toBe('it-IT');
  });
  it('translates explicit UI keys and falls back without altering content', () => {
    expect(translate('it', 'Settings')).toBe('Impostazioni');
    expect(translate('en', 'Settings')).toBe('Settings');
    expect(translate('it', 'owner/repository#medium')).toBe('owner/repository#medium');
    expect(translate('it', 'toString')).toBe('toString');
    expect(Object.values(italian).every((text) => text.trim().length > 0)).toBe(true);
  });
  it('interpolates names literally, including braces and replacement characters', () => {
    expect(translate('it', 'Message {name}', { name: '$& {count}' })).toBe('Scrivi a $& {count}');
    expect(translate('it', 'Message {name}')).toBe('Scrivi a {name}');
    expect(translate('en', '{count}', { count: 0 })).toBe('0');
  });
  it('preserves every named placeholder in the Italian dictionary', () => {
    const slots = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [key, value] of Object.entries(italian)) expect(slots(value), key).toEqual(slots(key));
  });
  it('explains squash merging in Italian without changing the English dialog', () => {
    expect(translate('it', 'Merge PR #{number}?', { number: 10 })).toBe('Integrare la PR #10?');
    expect(translate('it', 'Squash & merge')).toBe('Integra unificando i commit');
    expect(translate('it', 'Cancel')).toBe('Annulla');
    expect(translate('it', '“{title}” passed QA. It will be squash-merged into {branch}.', { title: 'Aggiungi subtract', branch: 'main' }))
      .toBe('“Aggiungi subtract” ha superato la verifica QA. I suoi commit verranno unificati in un unico commit e integrati nel ramo main.');
    expect(translate('en', 'Squash & merge')).toBe('Squash & merge');
    expect(translate('en', 'Cancel')).toBe('Cancel');
    expect(translate('en', '“{title}” passed QA. It will be squash-merged into {branch}.', { title: 'Add subtract', branch: 'main' }))
      .toBe('“Add subtract” passed QA. It will be squash-merged into main.');
  });
  it('separates manager communication from English repository artifacts', () => {
    expect(communicationInstructions('it')).toContain('Reply to the manager in Italian');
    expect(communicationInstructions('it')).toContain('pull request text and repository QA briefs in English');
    expect(communicationInstructions(undefined)).toContain('Reply to the manager in English');
    expect(voiceSample('en')).toBe(SAMPLE_LINE);
    expect(voiceSample('it')).toContain('Ciao!');
  });
});

describe('speech voice language', () => {
  const en = { name: 'English', lang: 'en-US', default: true };
  const italianVoice = { name: 'Italian', lang: 'it-IT' };
  const otherIt = { name: 'Italian default', lang: 'it_CH', default: true };
  it('prefers the selected matching voice, then a matching default', () => {
    expect(speechVoice([en, italianVoice, otherIt], italianVoice.name, 'it')).toBe(italianVoice);
    expect(speechVoice([en, italianVoice, otherIt], en.name, 'it')).toBe(otherIt);
    expect(speechVoice([en, italianVoice], en.name, 'it')).toBe(italianVoice);
  });
  it('keeps an explicit voice as fallback and tolerates missing voices', () => {
    expect(speechVoice([en], en.name, 'it')).toBe(en);
    expect(speechVoice([], '', 'it')).toBeUndefined();
    expect(speechVoice([en], 'missing', 'it')).toBeUndefined();
  });
});
