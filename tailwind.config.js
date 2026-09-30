/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        deva: {
          maroon: {
            50: '#FDF2F4',
            100: '#FBE8EC',
            200: '#F5C7D1',
            300: '#E898AA',
            400: '#D55E7A',
            500: '#A92446',
            600: '#8C1B37',
            700: '#7A1C30',
            800: '#5B1425',
            900: '#420D1A',
            950: '#2A0810',
          },
          gold: {
            50: '#FBF8EF',
            100: '#F6EED8',
            200: '#ECDCAD',
            300: '#DFC47D',
            400: '#D4AC4C',
            500: '#C88722',
            600: '#B06F17',
            700: '#8C5212',
            800: '#724113',
            900: '#5F3613',
          },
          ivory: {
            50: '#FDFCFB',
            100: '#FAF8F5',
            200: '#F3EFEA',
            300: '#EAE4DC',
            400: '#D8CFC3',
            500: '#BEB3A3',
            600: '#9E9281',
            700: '#7B7162',
            800: '#5A5247',
            900: '#3D372F',
          },
        },
      },
      boxShadow: {
        'soft': '0 2px 12px -2px rgba(66, 13, 26, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
        'medium': '0 8px 24px -4px rgba(66, 13, 26, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'elevated': '0 20px 35px -8px rgba(66, 13, 26, 0.12), 0 8px 12px -3px rgba(0, 0, 0, 0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
