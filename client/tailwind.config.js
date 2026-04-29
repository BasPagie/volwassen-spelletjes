/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef3e2',
          100: '#fde4b9',
          200: '#fcd48c',
          300: '#fbc35f',
          400: '#fab63d',
          500: '#f9a825',
          600: '#f59b20',
          700: '#ef8c1a',
          800: '#e97d15',
          900: '#df640c',
        },
        game: {
          yellow: '#f9df6d',
          green: '#a0c35a',
          blue: '#b0c4ef',
          purple: '#ba81c5',
        },
      },
      fontFamily: {
        display: ['"Nunito"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      animation: {
        'shake': 'shake 0.5s ease-in-out',
        'pop': 'pop 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'confetti': 'confetti 1s ease-out forwards',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
