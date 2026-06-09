import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** 标记无需登录即可访问的路由（如登录接口、公开内容） */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
