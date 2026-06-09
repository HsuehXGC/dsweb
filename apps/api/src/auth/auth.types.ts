/** JWT access token 载荷（内部用户） */
export interface AccessTokenPayload {
  sub: string; // user.id (字符串化的 bigint)
  email: string;
  role: string; // role.code
  aud: 'internal';
}

/** 请求上下文中附加的当前用户（由 JwtAuthGuard 注入） */
export interface AuthenticatedUser {
  id: bigint;
  uuid: string;
  email: string;
  roleCode: string;
  permissions: string[]; // ["customers.read", "orders.*", ...]
}
