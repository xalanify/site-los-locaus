/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--aj-500) / <alpha-value>)',
        secondary: '#282828',
        dark: '#000000',
        accent: 'rgb(var(--aj-600) / <alpha-value>)',
        // Laranja remapeado para a paleta violeta (estética do site).
        // Os valores vêm de variáveis CSS (--aj-*) para poder mudar a
        // paleta inteira num sítio só, sem reescrever nenhuma classe.
        orange: {
          300: 'rgb(var(--aj-300) / <alpha-value>)',
          400: 'rgb(var(--aj-400) / <alpha-value>)',
          500: 'rgb(var(--aj-500) / <alpha-value>)',
          600: 'rgb(var(--aj-600) / <alpha-value>)',
          700: 'rgb(var(--aj-700) / <alpha-value>)',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
