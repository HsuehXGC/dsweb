import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // DS SmartLawn 品牌配色 —— 对应《主页前端设计》4.1 配色方案
        brand: {
          DEFAULT: '#1B4332', // 主色（深绿）
          dark: '#143524',
          mid: '#2D6A4F', // 辅色（中绿）
          light: '#F4F8F5', // 背景浅绿
          gold: '#C9A227', // 金色（强调）
        },
      },
      maxWidth: {
        container: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
