import type { FrameworkType } from '../types';
import { FrameworkDetector } from './frameworkDetector';

/**
 * EndpointExtractorインターフェース（仮定義）
 * FastifyExtractor実装時に正式な型定義を別ファイルに移動する
 */
export interface EndpointExtractor {
  readonly framework: FrameworkType;
  extract(options: ExtractorOptions): Promise<ExtractedEndpoints>;
}

/**
 * Extractor実行オプション（仮定義）
 */
export interface ExtractorOptions {
  projectRoot: string;
  entryFilePath?: string;
  tsconfigPath?: string;
  verbose?: boolean;
}

/**
 * 抽出結果（仮定義）
 */
export interface ExtractedEndpoints {
  framework: FrameworkType;
  projectRoot: string;
  routes: unknown[];
}

/**
 * 登録済みExtractor
 * FastifyExtractorが実装されたら追加する
 */
const EXTRACTORS: ReadonlyMap<FrameworkType, new () => EndpointExtractor> = new Map([
  // ['fastify', FastifyExtractor], // TODO: FastifyExtractor実装後に追加
]);

export class ExtractorFactory {
  private readonly detector: FrameworkDetector;

  constructor() {
    this.detector = new FrameworkDetector();
  }

  /**
   * フレームワークを指定してExtractorを取得
   */
  getExtractor(framework: FrameworkType): EndpointExtractor {
    const ExtractorClass = EXTRACTORS.get(framework);

    if (!ExtractorClass) {
      throw new Error(
        `Unsupported framework: ${framework}. FastifyExtractor implementation pending.`
      );
    }

    return new ExtractorClass();
  }

  /**
   * プロジェクトから自動検出してExtractorを取得
   */
  async getExtractorForProject(projectRoot: string): Promise<EndpointExtractor> {
    const detection = await this.detector.detect(projectRoot);

    if (!detection) {
      throw new Error(
        `Could not detect framework in ${projectRoot}. ` +
        `Supported frameworks: fastify (coming soon)`
      );
    }

    return this.getExtractor(detection.framework);
  }

  /**
   * 対応フレームワーク一覧を取得
   */
  getSupportedFrameworks(): readonly FrameworkType[] {
    return ['fastify']; // 現時点ではFastifyのみ（実装待ち）
  }
}
