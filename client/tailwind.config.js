export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e8eaf6',
          100: '#c5cae9',
          500: '#3949ab',
          600: '#283593',
          700: '#1a237e',
          800: '#0d1b6e',
          900: '#040d5e',
          950: '#0b1129'
        },
        cream: {
          50: '#fefef9',
          100: '#f5f0e8',
          200: '#f5f0dc',
          300: '#ede3c0'
        },
        gold: {
          DEFAULT: '#f59e0b',
          400: '#fbbf24',
          500: '#f59e0b',
        },
        dark: '#0f1729'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}