// src/types/yaml.ts

/**
 * YAMLパラメータ表現
 */
export type YamlParams = Record<string, string>;

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
};
