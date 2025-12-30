// src/types/endpoint.ts

import type { HttpMethod } from './http';
import type { ParamInfo } from './param';
import type { AuthInfo } from './auth';
import type { EndpointResponses } from './response';

/**
 * エンドポイント情報
 */
export type EndpointInfo = {
  /** エンドポイントパス */
  readonly path: string;
  /** HTTPメソッド */
  readonly method: HttpMethod;
  /** パスパラメータ */
  readonly pathParams: readonly ParamInfo[];
  /** クエリパラメータ */
  readonly queryParams: readonly ParamInfo[];
  /** ボディパラメータ */
  readonly bodyParams: readonly ParamInfo[];
  /** 認証情報 */
  readonly auth: AuthInfo;
  /** ソースファイルパス */
  readonly sourceFile: string;
  /** 行番号 */
  readonly lineNumber: number;
  /** レスポンス情報（extractResponses有効時のみ） */
  readonly responses?: EndpointResponses;
};
