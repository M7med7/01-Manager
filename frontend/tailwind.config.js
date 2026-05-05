/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        planner: {
          bg: '#f3f2f1',
          card: '#ffffff',
          text: '#201f1e',
          subtext: '#605e5c',
          border: '#edebe9',
          primary: '#0f6cbd',
          hover: '#f3f2f1',
        }
      }
    },
  },
  plugins: [],
}
