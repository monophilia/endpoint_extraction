// src/extractors/nestjs/index.ts

import type { EndpointExtractor } from '../types';
import type {
  ExtractorOptions,
  ExtractedEndpoints,
  FrameworkType,
  PrefixedEndpoints,
  ControllerRegistration,
} from '../../types';
import { Project, SourceFile } from 'ts-morph';
import { ConfigLoader } from '../../config/loader';
import { ModuleParser } from './moduleParser';
import { ControllerParser } from './controllerParser';
import { GuardAnalyzer } from './guardAnalyzer';
import { NestJSAuthDetector } from './authDetector';
import * as path from 'path';

/**
 * NestJSフレームワーク用エンドポイント抽出クラス
 */
export class NestJSExtractor implements EndpointExtractor {
  readonly framework: FrameworkType = 'nestjs';
  private readonly configLoader = new ConfigLoader();

  /**
   * エンドポイント抽出を実行
   * @param options 抽出オプション
   * @returns 抽出されたエンドポイント情報
   */
  async extract(options: ExtractorOptions): Promise<ExtractedEndpoints> {
    const {
      projectRoot,
      entryFilePath = 'src/app.module.ts',
      tsconfigPath,
      configPath,
      verbose = false,
    } = options;

    // 1. 設定ファイルを読み込み
    const config = await this.configLoader.load(projectRoot, configPath);
    const nestjsConfig = config.nestjs?.auth ?? {};

    const fullEntryPath = path.join(projectRoot, entryFilePath);
    const fullTsconfigPath = tsconfigPath
      ? path.join(projectRoot, tsconfigPath)
      : path.join(projectRoot, 'tsconfig.json');

    const project = new Project({ tsConfigFilePath: fullTsconfigPath });

    // 2. app.module.tsを解析
    const moduleParser = new ModuleParser();
    const moduleFile = project.getSourceFile(fullEntryPath);
    if (!moduleFile) {
      throw new Error(`Module file not found: ${fullEntryPath}`);
    }

    const moduleInfo = moduleParser.parseModule(moduleFile);

    if (verbose) {
      console.log(`[NestJSExtractor] Found ${moduleInfo.controllers.length} controllers`);
      console.log(`[NestJSExtractor] Global guards: ${moduleInfo.globalGuards.join(', ')}`);
    }

    // 3. GuardAnalyzerとAuthDetectorを初期化
    const guardAnalyzer = new GuardAnalyzer(project);
    const authDetector = new NestJSAuthDetector(nestjsConfig, guardAnalyzer);

    // 4. 各コントローラーを解析
    const controllerParser = new ControllerParser(
      nestjsConfig.publicDecorators ?? ['Public', 'SkipAuth']
    );

    const routes = this.parseControllers(
      moduleInfo.controllers,
      project,
      controllerParser,
      moduleInfo.globalGuards,
      authDetector,
      verbose
    );

    // 5. 統計計算
    const allEndpoints = routes.flatMap(r => r.endpoints);
    const authRequiredCount = allEndpoints.filter(e => e.auth?.required === true).length;
    const publicCount = allEndpoints.filter(e => e.auth?.required === false).length;

    return {
      framework: 'nestjs',
      projectRoot,
      routes,
      extractedAt: new Date().toISOString(),
      authRequiredCount,
      publicCount,
    };
  }

  /**
   * コントローラー一覧を解析
   */
  private parseControllers(
    registrations: readonly ControllerRegistration[],
    project: Project,
    controllerParser: ControllerParser,
    globalGuards: readonly string[],
    authDetector: NestJSAuthDetector,
    verbose: boolean
  ): PrefixedEndpoints[] {
    return registrations
      .map(reg => this.loadControllerFile(reg, project, verbose))
      .filter((file): file is SourceFile => file !== null)
      .map(file => controllerParser.parseController(file))
      .filter(controller => controller !== null)
      .map(controller => ({
        prefix: `/${controller.basePath}`.replace(/\/+/g, '/'),
        endpoints: controllerParser.extractEndpoints(
          controller,
          globalGuards,
          authDetector
        ),
      }));
  }

  /**
   * コントローラーファイルを読み込み
   */
  private loadControllerFile(
    registration: ControllerRegistration,
    project: Project,
    verbose: boolean
  ): SourceFile | null {
    const controllerFile = project.getSourceFile(registration.resolvedPath);

    if (!controllerFile && verbose) {
      console.log(`[NestJSExtractor] Controller file not found: ${registration.resolvedPath}`);
    }

    return controllerFile ?? null;
  }

  /**
   * このExtractorが対象プロジェクトを処理可能か判定
   * @param projectRoot プロジェクトルートパス
   * @returns 処理可能な場合true
   */
  async canHandle(projectRoot: string): Promise<boolean> {
    const packageJsonPath = `${projectRoot}/package.json`;
    const file = Bun.file(packageJsonPath);

    if (!(await file.exists())) {
      return false;
    }

    const content = await file.text();
    const packageJson = JSON.parse(content);

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    return '@nestjs/common' in allDeps;
  }
}
