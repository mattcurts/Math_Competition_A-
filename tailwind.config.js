/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
        },
        secondary: "#64748b",
      },
      borderRadius: {
        container: "0.5rem",
      },
      gap: {
        "form-field": "1rem",
      },
    },
  },
  plugins: [],
};
