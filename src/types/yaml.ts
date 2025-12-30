// src/types/yaml.ts

/**
 * YAMLパラメータ表現
 */
export type YamlParams = Record<string, string>;

/**
 * YAML成功レスポンス表現
 */
export type YamlSuccessResponse = {
  readonly code: number;
  readonly dataType: YamlParams;
};

/**
 * YAMLエラーレスポンス表現
 */
export type YamlErrorResponse = {
  readonly code: number;
  readonly message: string;
};

/**
 * YAMLレスポンス表現
 */
export type YamlResponses = {
  readonly success?: YamlSuccessResponse;
  readonly errors?: readonly YamlErrorResponse[];
};

/**
 * YAMLエンドポイント表現
 */
export type YamlEndpoint = {
  readonly METHOD: string;
  readonly pathParams?: YamlParams;
  readonly queryParams?: YamlParams;
  readonly bodyParams?: YamlParams;
  readonly requiresAuth: boolean;
  readonly authMiddlewares?: readonly string[];
  readonly responses?: YamlResponses;
};
