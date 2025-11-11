import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#002040', // Bleu foncé Waremme Volley
          dark: '#001528',
          light: '#003366',
        },
        secondary: {
          DEFAULT: '#1a1a1a', // Texte principal
          light: '#4a4a4a',
          lighter: '#6a6a6a',
        },
        accent: {
          DEFAULT: '#2563eb', // Bleu pour les liens/secondaires
          dark: '#1e40af',
          light: '#3b82f6',
        },
        background: {
          DEFAULT: '#ffffff',
          secondary: '#f9fafb',
          tertiary: '#f3f4f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }
  },
  plugins: []
} satisfies Config;