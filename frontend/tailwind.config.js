/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2C7BE5',
          light: '#5A9EFF',
          dark: '#1A5BB8',
          'ultra-light': '#E8F2FF',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          tertiary: '#9CA3AF',
        },
        border: '#E5E7EB',
        background: {
          DEFAULT: '#FFFFFF',
          gray: '#F9FAFB',
          'gray-dark': '#F3F4F6',
        },
      },
      borderRadius: {
        'sm': '6px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
}

