import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // DS SmartLawn 品牌色（深绿系，对应需求文档视觉风格）
        brand: {
          DEFAULT: '#1f6b4a',
          dark: '#14563b',
          light: '#e7f2ec',
        },
      },
    },
  },
  plugins: [],
};

export default config;
