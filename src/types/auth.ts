// src/types/auth.ts

/**
 * 認証ミドルウェアの検出フックポイント（Fastify）
 */
export const FASTIFY_AUTH_HOOKS = ['preHandler', 'onRequest', 'preValidation'] as const;

export type FastifyAuthHook = (typeof FASTIFY_AUTH_HOOKS)[number];

/**
 * デフォルトの認証ミドルウェア識別子
 */
export const DEFAULT_AUTH_MIDDLEWARES = [
  'tokenVerification',
  'authGuard',
  'authenticate',
  'requireAuth',
  'verifyToken',
  'isAuthenticated',
  'authMiddleware',
  'jwtVerify',
] as const;

/**
 * 認証解析設定
 */
export type AuthConfig = {
  /** 認証ミドルウェアの識別子リスト */
  readonly middlewareNames: readonly string[];
  /** 検出対象のフックポイント（Fastify用） */
  readonly hookPoints: readonly FastifyAuthHook[];
};

/**
 * デフォルトの認証設定
 */
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  middlewareNames: [...DEFAULT_AUTH_MIDDLEWARES],
  hookPoints: ['preHandler', 'onRequest'],
};

/**
 * 認証情報の詳細
 */
export type AuthInfo = {
  /** 認証必須かどうか */
  readonly required: boolean;
  /** 検出されたミドルウェア名（複数の場合あり） */
  readonly middlewares: readonly string[];
  /** 検出されたフックポイント */
  readonly hookPoint?: string;
};
