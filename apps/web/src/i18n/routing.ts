import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  // URL 前缀 /en/* 与 /zh/* —— 对应需求文档 C6 国际化
  localePrefix: 'always',
});
