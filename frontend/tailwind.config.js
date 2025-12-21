/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Emergency-focused color palette
        critical: '#EF4444',
        moderate: '#F59E0B', 
        low: '#10B981',
        primary: '#2563EB',
        secondary: '#64748B',
      }
    },
  },
  plugins: [],
}
