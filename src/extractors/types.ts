// src/extractors/types.ts

import type { FrameworkType, ExtractorOptions, ExtractedEndpoints } from '../types';

/**
 * エンドポイント抽出インターフェース
 * 各フレームワークの実装はこのインターフェースに準拠する
 */
export interface EndpointExtractor {
  /** フレームワーク名 */
  readonly framework: FrameworkType;

  /**
   * エンドポイント抽出を実行
   * @param options 抽出オプション
   * @returns 抽出されたエンドポイント情報
   */
  extract(options: ExtractorOptions): Promise<ExtractedEndpoints>;

  /**
   * このExtractorが対象プロジェクトを処理可能か判定
   * @param projectRoot プロジェクトルートパス
   * @returns 処理可能な場合true
   */
  canHandle(projectRoot: string): Promise<boolean>;
}
