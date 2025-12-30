/**
 * エクストラクター設定ファイルの型
 */
export type ExtractorConfig = {
  readonly common?: CommonConfig;
  readonly nestjs?: NestJSConfig;
  readonly fastify?: FastifyConfig;
};

/**
 * 共通設定
 */
export type CommonConfig = {
  readonly outputFormat?: 'yaml' | 'json';
  readonly extractResponses?: boolean;
  readonly responseDepth?: number;
};

/**
 * NestJS固有設定
 */
export type NestJSConfig = {
  readonly auth?: NestJSAuthConfigFile;
  readonly params?: NestJSParamsConfig;
};

/**
 * NestJS認証設定（設定ファイル用）
 */
export type NestJSAuthConfigFile = {
  /** 認証ガードとして扱うガード名パターン（正規表現） */
  readonly guardPatterns?: readonly string[];
  /** 明示的に認証ガードとして扱うガード名 */
  readonly authGuards?: readonly string[];
  /** 認証ガードから除外するガード名 */
  readonly excludeGuards?: readonly string[];
  /** 公開エンドポイントを示すデコレーター名 */
  readonly publicDecorators?: readonly string[];
  /** 公開エンドポイントを示すメタデータキー */
  readonly publicMetadataKeys?: readonly string[];
};

/**
 * NestJSパラメーター設定
 */
export type NestJSParamsConfig = {
  readonly customDecorators?: readonly CustomDecoratorConfig[];
};

/**
 * カスタムデコレーター設定
 */
export type CustomDecoratorConfig = {
  readonly name: string;
  readonly type: 'custom';
  readonly description?: string;
};

/**
 * Fastify固有設定（将来の拡張用）
 */
export type FastifyConfig = {
  readonly auth?: FastifyAuthConfigFile;
};

/**
 * Fastify認証設定
 */
export type FastifyAuthConfigFile = {
  readonly middlewareNames?: readonly string[];
};
