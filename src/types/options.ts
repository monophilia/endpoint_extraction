// src/types/options.ts

import type { AuthConfig } from './auth';
import type { FrameworkType } from './framework';

/**
 * Extractor実行時のオプション
 */
export type ExtractorOptions = {
  /** プロジェクトのルートディレクトリ */
  readonly projectRoot: string;
  /** エントリーファイルのパス（プロジェクトルートからの相対パス） */
  readonly entryFilePath?: string;
  /** tsconfigのパス（プロジェクトルートからの相対パス） */
  readonly tsconfigPath?: string;
  /** 認証解析設定 */
  readonly authConfig?: AuthConfig;
  /** 詳細ログ出力 */
  readonly verbose?: boolean;
};

/**
 * CLIコマンドラインオプション
 */
export type CLIOptions = {
  /** プロジェクトのルートディレクトリ */
  readonly projectRoot: string;
  /** フレームワーク指定（未指定時は自動検出） */
  readonly framework?: FrameworkType;
  /** 出力ファイルパス */
  readonly outputPath?: string;
  /** 詳細ログ出力 */
  readonly verbose?: boolean;
  /** 認証解析設定 */
  readonly authConfig?: AuthConfig;
};
