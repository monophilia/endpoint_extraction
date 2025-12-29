// src/types/output.ts

import type { EndpointInfo } from './endpoint';

/**
 * プレフィックス単位のエンドポイント集約
 */
export type PrefixedEndpoints = {
  /** URLプレフィックス（例: '/users', '/rooms'） */
  readonly prefix: string;
  /** 該当エンドポイントの配列 */
  readonly endpoints: readonly EndpointInfo[];
};

/**
 * 抽出結果の最終出力型
 */
export type ExtractedEndpoints = {
  /** フレームワーク名 */
  readonly framework: string;
  /** プロジェクトルートパス */
  readonly projectRoot: string;
  /** 抽出日時（ISO 8601形式） */
  readonly extractedAt: string;
  /** プレフィックス単位のルート配列 */
  readonly routes: readonly PrefixedEndpoints[];
  /** 認証必須エンドポイント数 */
  readonly authRequiredCount: number;
  /** 公開エンドポイント数 */
  readonly publicCount: number;
};
