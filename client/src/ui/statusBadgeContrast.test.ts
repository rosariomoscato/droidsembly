import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './colorMath';
import { PALETTES, STATUS_KIND, statusFill, type StatusName } from './statusLook';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const ink = css.match(/--ink:\s*(#[0-9a-f]{6})/i)![1];

describe('status badge text', () => {
  it('sets its own dark text instead of inheriting the light panel heading text', () => {
    const rule = css.match(/(?:^|\n)\.status\s*\{([^}]+)\}/)![1];
    expect(rule).toMatch(/\bcolor:\s*var\(--ink\)\s*;/);
    expect(contrastRatio(ink, statusFill('idle', 'standard'))).toBeGreaterThanOrEqual(7);
    expect(contrastRatio('#faf8f5', statusFill('idle', 'standard'))).toBeLessThan(2);
  });

  it.each(PALETTES)('meets WCAG AA for every status in the %s palette', palette => {
    for (const status of Object.keys(STATUS_KIND) as StatusName[]) {
      expect(contrastRatio(ink, statusFill(status, palette)), `${palette}: ${status}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
