import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0A0A0F',
        'bg-surface': '#13131A',
        'bg-border': '#1E1E2E',
        'accent-violet': '#6C63FF',
        'accent-mint': '#00D4AA',
        'accent-orange': '#FF6B35',
        'text-primary': '#F0F0FF',
        'text-muted': '#6B7280',
      },
      fontFamily: {
        'space-grotesk': ['var(--font-space-grotesk)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-apex': 'linear-gradient(135deg, #6C63FF, #00D4AA)',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}

export default config
