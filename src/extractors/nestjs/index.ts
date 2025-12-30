// src/extractors/nestjs/index.ts

import type { EndpointExtractor } from '../types';
import type { ExtractorOptions, ExtractedEndpoints, FrameworkType } from '../../types';

/**
 * NestJSフレームワーク用エンドポイント抽出クラス
 */
export class NestJSExtractor implements EndpointExtractor {
  readonly framework: FrameworkType = 'nestjs';

  /**
   * エンドポイント抽出を実行
   * @param options 抽出オプション
   * @returns 抽出されたエンドポイント情報
   */
  async extract(options: ExtractorOptions): Promise<ExtractedEndpoints> {
    // TODO: 実装
    // 1. ConfigLoaderで設定を読み込み
    // 2. moduleParserでapp.module.tsを解析
    // 3. controllerParserで各コントローラーを解析
    // 4. authDetectorで認証情報を検出
    // 5. EndpointInfo形式に変換

    return {
      framework: this.framework,
      projectRoot: options.projectRoot,
      extractedAt: new Date().toISOString(),
      routes: [],
      authRequiredCount: 0,
      publicCount: 0,
    };
  }

  /**
   * このExtractorが対象プロジェクトを処理可能か判定
   * @param projectRoot プロジェクトルートパス
   * @returns 処理可能な場合true
   */
  async canHandle(projectRoot: string): Promise<boolean> {
    // @nestjs/common の存在をチェック
    const packageJsonPath = `${projectRoot}/package.json`;
    const file = Bun.file(packageJsonPath);

    if (!(await file.exists())) {
      return false;
    }

    const packageJson = JSON.parse(await file.text());
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    return '@nestjs/common' in dependencies;
  }
}
