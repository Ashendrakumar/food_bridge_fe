/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class', // matches the prototype's `body.dark` theme
  theme: {
    extend: {
      colors: {
        // ---- FoodBridge brand (from FoodBridge_Bootstrap_Prototype.html :root) ----
        primary: {
          DEFAULT: '#d87757', // rgb(216, 119, 87)
          deep: '#b65c3f',
          bright: '#e2906c',
          soft: '#fdf0e7',
        },
        success: {
          DEFAULT: '#1e9e5c',
          deep: '#146c43',
          soft: '#e7f7ee',
        },
        orange: {
          DEFAULT: '#ff7a3d',
          soft: '#ffeee3',
        },
        // ---- Neutrals / surfaces ----
        cream: '#faf8f6',
        ink: '#241e1a',
        muted: '#7a6f65',
        line: '#e8e1d8',
        // ---- Status badge palette (listing lifecycle) ----
        status: {
          pending: '#ff7a3d',
          claimed: '#9a6b00',
          pickedup: '#2258c7',
          delivered: '#146c43',
          confirmed: '#0f7a45',
          expired: '#8a8a8a',
        },
        // ---- Dark-mode surface tokens (body.dark in the prototype) ----
        'cream-dark': '#1c1714',
        'ink-dark': '#f3ede8',
        'line-dark': '#332a22',
        'muted-dark': '#a69a8e',
        'surface-dark': '#241e19',
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Poppins"', 'sans-serif'],
      },
      borderRadius: {
        fb: '20px', // --radius
        'fb-btn': '14px',
      },
      boxShadow: {
        fb: '0 10px 30px rgba(20, 60, 35, 0.08)', // --shadow
        'fb-lg': '0 20px 50px rgba(20, 60, 35, 0.14)', // --shadow-lg
      },
      backgroundImage: {
        'gradient-primary':
          'linear-gradient(135deg, #d87757, #b65c3f)',
        'gradient-orange':
          'linear-gradient(135deg, #ff7a3d, #e8621f)',
      },
    },
  },
  plugins: [],
};
