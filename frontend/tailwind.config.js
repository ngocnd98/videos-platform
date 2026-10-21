/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Thumbnail gradients come from the API (videos.thumb_color), so Tailwind can't see them in source.
  safelist: [{ pattern: /^(from|to)-(orange|rose|amber|yellow|violet|indigo|sky|cyan|teal|emerald|pink|fuchsia)-(200|300)$/ }],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
