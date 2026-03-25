/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          accent: "#7c9a92",     // muted sage
          warm: "#c9a87c",       // warm sand
          rose: "#c4908a",       // dusty rose
          slate: "#8a9bae",      // steel blue
          cream: "#f5f0e8",      // warm cream
          ink: "#2c2c2c",        // near-black ink
          paper: "#faf8f4",      // paper white
          muted: "#6b7b7e",      // muted teal-gray
        },
      },
    },
  },
  plugins: [],
};
