/**
 * API 统一响应信封 —— 对应需求文档 第八章「API 设计规范」。
 * 成功：{ data, meta }；失败：{ error: { code, message, details } }
 */

export interface ApiMeta {
  total?: number;
  current_page?: number;
  page_size?: number;
  total_pages?: number;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginationQuery {
  page?: number;
  page_size?: number;
  sort?: string; // 形如 "-created_at"
}

/** 终端客户语言偏好 */
export type Locale = 'en' | 'zh';
