import type { Locale } from '@dsweb/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export interface CmsBlock {
  type: string;
  content: Record<Locale, Record<string, unknown>>;
}

export interface CmsSection {
  type: string;
  config: Record<string, unknown>;
  blocks: CmsBlock[];
}

export interface CmsPage {
  slug: string;
  title: string;
  seo: { title: string | null; description: string | null };
  sections: CmsSection[];
}

/** SSR 拉取已发布页面。失败时返回 null，由调用方兜底。 */
export async function fetchPage(slug: string): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API_BASE}/public/pages/${slug}`, {
      // 开发期不缓存，保证 CMS 编辑后刷新即见；生产可改为 revalidate
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: CmsPage };
    return json.data;
  } catch {
    return null;
  }
}

export interface BlogPost {
  uuid: string;
  slug: string;
  category: string | null;
  tags: string[] | null;
  content: Partial<Record<Locale, { title?: string; body?: string }>>;
  publishedAt: string | null;
}

export async function fetchPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${API_BASE}/public/posts`, { cache: 'no-store' });
    if (!res.ok) return [];
    return ((await res.json()).data ?? []) as BlogPost[];
  } catch {
    return [];
  }
}

export async function fetchPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${API_BASE}/public/posts/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).data as BlogPost;
  } catch {
    return null;
  }
}

/** 取某个 section 第一个 block 在指定语言下的内容 */
export function blockContent<T = Record<string, unknown>>(
  section: CmsSection,
  locale: Locale,
): T | null {
  const block = section.blocks[0];
  if (!block) return null;
  return (block.content[locale] ?? block.content.en) as T;
}
