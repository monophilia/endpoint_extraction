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
  /** 設定ファイルのパス */
  readonly configPath?: string;
  /** 認証解析設定 */
  readonly authConfig?: AuthConfig;
  /** 詳細ログ出力 */
  readonly verbose?: boolean;
  /** レスポンス型を抽出するか（デフォルト: false） */
  readonly extractResponses?: boolean;
  /** レスポンス抽出の深さ制限（デフォルト: 3） */
  readonly responseDepthLimit?: number;
  /** 高度な解析を有効にするか（デフォルト: false） */
  readonly deepAnalysis?: boolean;
  /** 高度な解析の再帰深度制限（デフォルト: 3） */
  readonly deepAnalysisDepth?: number;
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
  /** レスポンス型を抽出するか */
  readonly extractResponses?: boolean;
  /** レスポンス抽出の深さ制限 */
  readonly responseDepthLimit?: number;
  /** 高度な解析を有効にするか */
  readonly deepAnalysis?: boolean;
  /** 高度な解析の再帰深度制限 */
  readonly deepAnalysisDepth?: number;
};
