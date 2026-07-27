/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

/* ============================================================
   BRAND THEMES

   The app ships all of these and switches between them at
   RUNTIME (Settings → Brand colour, persisted to localStorage).
   ThemeService puts a `theme-<name>` class on <body>; the CSS
   variables below are emitted for every theme by the plugin at
   the bottom of this file.

   DEFAULT_THEME is only the pre-hydration fallback baked into
   :root — i.e. what a brand-new visitor sees before they pick.
   ============================================================ */
const DEFAULT_THEME = 'terracotta';

/* Hex is the single source of truth; every channel triplet, dark-mode tint
   and gradient below is derived from it.

     primary.DEFAULT — buttons, active states. White text sits on this, so
                       each is chosen to clear WCAG AA (>= 4.5:1).
     primary.deep    — gradient end, link text, text on `soft` fills.
     primary.bright  — hover/dark-mode text (must read on dark surfaces).
     primary.soft    — tinted fills, selected cards, focus rings.
     accent.*        — warm counterpoint for avatars/badges/gradients.
                       Surface + gradient use only — not for body text. */
const THEMES = {
  // Warm terracotta — the original prototype palette. Appetising and
  // food-forward, but primary.DEFAULT is only 3.1:1 on white text.
  terracotta: {
    primary: { DEFAULT: '#d87757', deep: '#b65c3f', bright: '#e2906c', soft: '#fdf0e7' },
    accent: { DEFAULT: '#ff7a3d', deep: '#e8621f', soft: '#ffeee3' },
  },

  // Teal + amber accent. Fresh, hygienic and trustworthy; the amber keeps
  // food warmth. 5.5:1 on white text.
  teal: {
    primary: { DEFAULT: '#0f766e', deep: '#134e4a', bright: '#2dd4bf', soft: '#f0fdfa' },
    accent: { DEFAULT: '#f59e0b', deep: '#b45309', soft: '#fffbeb' },
  },

  // Navy + gold accent. Institutional credibility — reads well to municipal
  // partners and CSR donors. 8.7:1 on white text.
  navy: {
    primary: { DEFAULT: '#1e40af', deep: '#172554', bright: '#60a5fa', soft: '#eff6ff' },
    accent: { DEFAULT: '#f59e0b', deep: '#b45309', soft: '#fffbeb' },
  },

  // Emerald + orange accent. Sustainability / "rescued food" story. Note it
  // shares hue space with the `success` token, so success states read less
  // distinctly. 5.5:1 on white text.
  emerald: {
    primary: { DEFAULT: '#047857', deep: '#064e3b', bright: '#34d399', soft: '#ecfdf5' },
    accent: { DEFAULT: '#f97316', deep: '#c2410c', soft: '#fff7ed' },
  },

  // Indigo + amber accent. Modern product feel, maximum separation from the
  // green success states. 6.3:1 on white text.
  indigo: {
    primary: { DEFAULT: '#4f46e5', deep: '#3730a3', bright: '#818cf8', soft: '#eef2ff' },
    accent: { DEFAULT: '#f59e0b', deep: '#b45309', soft: '#fffbeb' },
  },
};

if (!THEMES[DEFAULT_THEME]) {
  throw new Error(
    `tailwind.config.js: unknown DEFAULT_THEME "${DEFAULT_THEME}". ` +
      `Expected one of: ${Object.keys(THEMES).join(', ')}`
  );
}

// ---- Colour helpers -------------------------------------------------------
const SURFACE_DARK = '#241e19'; // body.dark card surface

/** '#d87757' -> [216, 119, 87] */
function channels(hex) {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** '#d87757' -> '216 119 87' (space-separated, for rgb(... / <alpha>)) */
function triplet(hex) {
  return channels(hex).join(' ');
}

/** Blend `hex` over `onto` at `weight` opacity, returning a triplet. */
function blend(hex, onto, weight) {
  const a = channels(hex);
  const b = channels(onto);
  return a.map((v, i) => Math.round(v * weight + b[i] * (1 - weight))).join(' ');
}

/**
 * The light-mode `soft` tints are near-white, which blows out on a dark
 * surface. Derive an equivalent dark tint by blending the brand hue over the
 * dark surface instead — keeps the same "subtle brand-tinted fill" reading.
 */
function softDark(hex) {
  return blend(hex, SURFACE_DARK, 0.22);
}

/** 'R G B' + alpha -> 'rgb(R G B / 0.3)' */
function alpha(tripletStr, a) {
  return `rgb(${tripletStr} / ${a})`;
}

/**
 * Every brand-derived custom property, for one theme.
 *
 * These must ALL be declared in the same rule as the triplets they read.
 * `var()` is substituted on the element where the property is *declared*, not
 * where it is used — so a `--fb-primary: rgb(var(--fb-primary-rgb))` sitting
 * on :root would freeze at the default palette and never follow the
 * `theme-*` class on <body>.
 */
function varsFor(theme) {
  const p = theme.primary;
  const a = theme.accent;
  const softP = triplet(p.soft);
  const softA = triplet(a.soft);
  return {
    // Raw channels — consumed by the Tailwind colour utilities (which append
    // `/ <alpha-value>`) and by component CSS needing custom opacity.
    '--fb-primary-rgb': triplet(p.DEFAULT),
    '--fb-primary-deep-rgb': triplet(p.deep),
    '--fb-primary-bright-rgb': triplet(p.bright),
    '--fb-primary-soft-rgb': softP,
    '--fb-accent-rgb': triplet(a.DEFAULT),
    '--fb-accent-deep-rgb': triplet(a.deep),
    '--fb-accent-soft-rgb': softA,
    // Named tokens — the ergonomic form used throughout the SCSS.
    '--fb-primary': p.DEFAULT,
    '--fb-primary-deep': p.deep,
    '--fb-primary-bright': p.bright,
    '--fb-primary-soft': p.soft,
    '--fb-accent': a.DEFAULT,
    '--fb-accent-deep': a.deep,
    '--fb-accent-soft': a.soft,
    // Legacy accent aliases, kept so existing rules keep working.
    '--fb-orange': a.DEFAULT,
    '--fb-orange-soft': a.soft,
    // Translucent brand tints (button glows, radial washes).
    '--fb-glow-primary': alpha(triplet(p.DEFAULT), 0.3),
    '--fb-glow-primary-deep': alpha(triplet(p.deep), 0.25),
    '--fb-wash-primary': alpha(triplet(p.bright), 0.18),
    '--fb-wash-accent': alpha(triplet(a.DEFAULT), 0.16),
    // Focus ring.
    '--fb-ring': `0 0 0 3px ${p.soft}`,
  };
}

/** Dark-mode overrides for one theme (only the `soft` fills change). */
function darkVarsFor(theme) {
  const softP = softDark(theme.primary.DEFAULT);
  const softA = softDark(theme.accent.DEFAULT);
  return {
    '--fb-primary-soft-rgb': softP,
    '--fb-accent-soft-rgb': softA,
    '--fb-primary-soft': alpha(softP, 1),
    '--fb-accent-soft': alpha(softA, 1),
    '--fb-orange-soft': alpha(softA, 1),
    '--fb-ring': `0 0 0 3px ${alpha(softP, 1)}`,
  };
}

// Colours resolve through CSS vars so runtime theme switching reaches every
// Tailwind utility (bg-primary, text-primary-deep, bg-primary/20, ...).
// `<alpha-value>` is Tailwind's placeholder for the opacity modifier.
const v = (name) => `rgb(var(--fb-${name}-rgb) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{html,ts}'],
  // ThemeService and the Settings picker compose these class names at runtime
  // (`theme-${id}`), so the content scanner never sees them as literals and
  // would purge the palette rules the plugin emits below. Derived from THEMES
  // so adding a palette needs no change here.
  safelist: Object.keys(THEMES).map((name) => `theme-${name}`),
  darkMode: 'class', // matches the prototype's `body.dark` theme
  theme: {
    extend: {
      colors: {
        // ---- FoodBridge brand — var-driven, see ThemeService ----
        primary: {
          DEFAULT: v('primary'),
          deep: v('primary-deep'),
          bright: v('primary-bright'),
          soft: v('primary-soft'),
        },
        accent: {
          DEFAULT: v('accent'),
          deep: v('accent-deep'),
          soft: v('accent-soft'),
        },
        // `orange` is the legacy accent alias used by existing markup.
        // Aliasing it to the theme accent retints those spots too, while
        // Tailwind's built-in orange-50..950 scale survives the deep merge
        // (badge-pending relies on orange-100/700).
        orange: {
          DEFAULT: v('accent'),
          soft: v('accent-soft'),
        },
        success: {
          DEFAULT: '#1e9e5c',
          deep: '#146c43',
          soft: '#e7f7ee',
        },
        // ---- Neutrals / surfaces ----
        cream: '#faf8f6',
        ink: '#241e1a',
        muted: '#7a6f65',
        line: '#e8e1d8',
        // ---- Status badge palette (listing lifecycle) ----
        status: {
          pending: '#ff7a3d',
          claimed: '#9a6b00',
          pickedup: '#2258c7',
          delivered: '#146c43',
          confirmed: '#0f7a45',
          expired: '#8a8a8a',
        },
        // ---- Dark-mode surface tokens (body.dark in the prototype) ----
        'cream-dark': '#1c1714',
        'ink-dark': '#f3ede8',
        'line-dark': '#332a22',
        'muted-dark': '#a69a8e',
        'surface-dark': SURFACE_DARK,
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Poppins"', 'sans-serif'],
      },
      borderRadius: {
        fb: '20px', // --radius
        'fb-btn': '14px',
      },
      boxShadow: {
        fb: '0 10px 30px rgba(20, 60, 35, 0.08)', // --shadow
        'fb-lg': '0 20px 50px rgba(20, 60, 35, 0.14)', // --shadow-lg
      },
      backgroundImage: {
        'gradient-primary':
          'linear-gradient(135deg, rgb(var(--fb-primary-rgb)), rgb(var(--fb-primary-deep-rgb)))',
        'gradient-accent':
          'linear-gradient(135deg, rgb(var(--fb-accent-rgb)), rgb(var(--fb-accent-deep-rgb)))',
        // Legacy alias — same gradient as gradient-accent.
        'gradient-orange':
          'linear-gradient(135deg, rgb(var(--fb-accent-rgb)), rgb(var(--fb-accent-deep-rgb)))',
      },
    },
  },
  plugins: [
    /* Emit every theme's variables so ThemeService can swap them by toggling a
       single class on <body>, with no rebuild.

       The selector is a bare `.theme-x` rather than `body.theme-x` so any
       element can opt into a palette — that's what lets the Settings picker
       render each theme's real swatch without duplicating hexes in TS.

       Custom properties inherit, so `.theme-x` on <body> already beats
       `:root` on <html> regardless of specificity. Within <body> though,
       specificity decides: `.theme-x.dark` (0,2,0) must outrank the
       default-theme `body.dark` (0,1,1) — it does, on class count. */
    plugin(({ addBase }) => {
      const fallback = THEMES[DEFAULT_THEME];
      const base = {
        ':root': varsFor(fallback),
        'body.dark': darkVarsFor(fallback),
      };
      for (const [name, theme] of Object.entries(THEMES)) {
        base[`.theme-${name}`] = varsFor(theme);
        base[`.theme-${name}.dark`] = darkVarsFor(theme);
      }
      addBase(base);
    }),
  ],
};
