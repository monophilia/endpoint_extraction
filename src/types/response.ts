// src/types/response.ts

import type { ParamInfo } from './param';

/**
 * レスポンスがどこから検出されたかを示す
 */
export type ResponseSource = 'return' | 'reply.send' | 'reply.code' | 'generic';

/**
 * 単一レスポンスの情報
 */
export type ResponseInfo = {
  /** HTTPステータスコード */
  readonly code: number;
  /** レスポンスデータの型（プロパティ情報） */
  readonly dataType: readonly ParamInfo[];
  /** 型名（型エイリアスがある場合） */
  readonly typeName?: string;
  /** 検出ソース */
  readonly source: ResponseSource;
  /** ソースファイル内の行番号 */
  readonly lineNumber: number;
};

/**
 * エラーレスポンスの情報
 */
export type ErrorResponseInfo = {
  /** HTTPステータスコード */
  readonly code: number;
  /** エラーメッセージ（リテラル文字列または型名） */
  readonly message: string;
  /** 追加データ型（あれば） */
  readonly dataType?: readonly ParamInfo[];
  /** 行番号 */
  readonly lineNumber: number;
};

/**
 * エンドポイントのレスポンス情報全体
 */
export type EndpointResponses = {
  /** 成功レスポンス（通常1つ、まれに複数） */
  readonly success: readonly ResponseInfo[];
  /** エラーレスポンス */
  readonly errors: readonly ErrorResponseInfo[];
};
