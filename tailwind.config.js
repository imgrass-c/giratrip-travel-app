/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#E6E2B5',
        primary: {
          DEFAULT: '#526655',
          dark: '#415344',
          light: '#637A67',
        },
        surface: {
          DEFAULT: '#F2EED9',
          hover: '#EAE5CD',
          dark: '#E2DCB8',
          border: '#D5CEBA',
        },
        ink: {
          DEFAULT: '#6E5454',
          muted: '#967E7E',
          light: '#BAA7A7',
        },
        terracotta: {
          DEFAULT: '#8A6B58',
          light: '#A38470',
        }
      },
    },
  },
  plugins: [],
}
