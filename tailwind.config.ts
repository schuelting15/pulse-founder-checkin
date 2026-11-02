import type { Config } from 'tailwindcss';
import tokens from './design/tokens.json';

// Every value points at a CSS variable generated from design/tokens.json (see src/styles/tokens.css),
// so every value can be traced back to a single design token in one hop.
const type = (name: keyof typeof tokens.type) =>
  [
    `var(--pulse-text-${name})`,
    {
      lineHeight: `var(--pulse-text-${name}-lh)`,
      letterSpacing: `var(--pulse-text-${name}-ls)`,
      fontWeight: `var(--pulse-text-${name}-weight)`,
    },
  ] as [string, { lineHeight: string; letterSpacing: string; fontWeight: string }];

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: 'var(--pulse-bg)',
      'bg-alt': 'var(--pulse-bg-alt)',
      ink: 'var(--pulse-ink)',
      'ink-2': 'var(--pulse-ink-2)',
      'ink-on-light': 'var(--pulse-ink-on-light)',
      'ink-2-on-light': 'var(--pulse-ink-2-on-light)',
      hairline: 'var(--pulse-hairline)',
      'neutral-lightest': 'var(--pulse-neutral-lightest)',
      'neutral-darker': 'var(--pulse-neutral-darker)',
      accent: 'var(--pulse-accent)',
      status: {
        'on-track': 'var(--pulse-status-on-track)',
        'at-risk': 'var(--pulse-status-at-risk)',
        'off-track': 'var(--pulse-status-off-track)',
        missing: 'var(--pulse-status-missing)',
      },
    },
    fontFamily: { sans: 'var(--pulse-font-sans)' },
    fontSize: {
      tiny: type('tiny'),
      small: type('small'),
      medium: type('medium'),
      large: type('large'),
      display: type('display'),
    },
    borderRadius: { none: '0px', dot: tokens.radius.dot },
    boxShadow: { none: 'none' },
    extend: {
      spacing: {
        gutter: 'var(--pulse-gutter)',
        cell: 'var(--pulse-cell)',
        block: 'var(--pulse-block)',
        hero: 'var(--pulse-hero)',
      },
      borderColor: { DEFAULT: 'var(--pulse-hairline)' },
      screens: { mobile: { max: '767px' } },
    },
  },
  plugins: [],
} satisfies Config;
