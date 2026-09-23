/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#F7F7EE',
          100: '#EBF0DF',
          200: '#D6E0C5',
          300: '#B8C9A3',
          400: '#9CB495',
          500: '#7E9777',
          600: '#647A67',
          700: '#4E6151',
          800: '#38483B',
          900: '#232D24',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}