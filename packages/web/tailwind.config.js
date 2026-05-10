/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Brand orange — replaces #F97316 / #EA580C / #FFF7ED in prototype
        primary: {
          DEFAULT: '#F97316',
          hover: '#EA580C',
          soft: '#FFF7ED',
        },
        // Semantic state backgrounds — replaces bare hex in prototype
        success: {
          DEFAULT: '#10B981',
          subtle: '#ECFDF5',
        },
        warning: {
          DEFAULT: '#B45309',
          subtle: '#FFFBEB',
        },
        danger: {
          DEFAULT: '#E11D48',
          subtle: '#FFF1F2',
          soft: '#FFF1F2',
        },
      },
      fontSize: {
        // 10px for tiny labels / metadata
        xxs: ['0.625rem', { lineHeight: '1rem' }],
        // 44px hero numerals (pair with tabular-nums tracking-tight font-extrabold)
        'xxl-display': ['2.75rem', { lineHeight: '1', letterSpacing: '-0.025em' }],
      },
      boxShadow: {
        // Orange-glow FAB
        fab: '0 10px 28px rgba(249,115,22,0.45)',
        // Elevated toast / sheets
        toast: '0 20px 60px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
};
