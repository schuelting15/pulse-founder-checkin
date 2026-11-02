import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import tokens from './tokens.json';

// tokens.css is generated from tokens.json; this fails if someone edits one without the other.
const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const v = (name: string) => css.match(new RegExp(`${name}: ([^;]+);`))?.[1];

describe('generated theme matches design/tokens.json', () => {
  it('font, colours and status', () => {
    expect(v('--pulse-font-sans')).toBe(tokens.font.family.value);
    expect(v('--pulse-bg')).toBe(tokens.color.background.value);
    expect(v('--pulse-hairline')).toBe(tokens.color.hairline.value);
    expect(v('--pulse-status-on-track')).toBe(tokens.status.onTrack.value);
    expect(v('--pulse-status-at-risk')).toBe(tokens.status.atRisk.value);
    expect(v('--pulse-status-off-track')).toBe(tokens.status.offTrack.value);
  });
  it('type scale', () => {
    for (const [name, t] of Object.entries(tokens.type)) {
      expect(v(`--pulse-text-${name}`)).toBe(t.size);
      expect(v(`--pulse-text-${name}-weight`)).toBe(String(t.weight));
    }
  });
  it('never names the commercial face as a font to load', () => {
    expect(tokens.font.family.value).not.toMatch(/Helvetica Neue LT/);
  });
});
