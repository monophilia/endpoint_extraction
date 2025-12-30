// src/extractors/nestjs/index.ts

import type { EndpointExtractor } from '../types';
import type {
  ExtractorOptions,
  ExtractedEndpoints,
  FrameworkType,
  PrefixedEndpoints,
  ControllerRegistration,
  ModuleRegistration,
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
    const moduleParser = new ModuleParser(projectRoot);
    const moduleFile = project.getSourceFile(fullEntryPath);
    if (!moduleFile) {
      throw new Error(`Module file not found: ${fullEntryPath}`);
    }

    const moduleInfo = moduleParser.parseModule(moduleFile);

    // 3. 再帰的にモジュールを解析して全コントローラーを収集
    const allControllers = this.collectAllControllers(
      moduleInfo,
      project,
      moduleParser,
      new Set<string>(),
      verbose
    );

    if (verbose) {
      console.log(`[NestJSExtractor] Found ${allControllers.length} controllers (recursive)`);
      console.log(`[NestJSExtractor] Global guards: ${moduleInfo.globalGuards.join(', ')}`);
    }

    // 4. GuardAnalyzerとAuthDetectorを初期化
    const guardAnalyzer = new GuardAnalyzer(project);
    const authDetector = new NestJSAuthDetector(nestjsConfig, guardAnalyzer);

    // 5. 各コントローラーを解析
    const controllerParser = new ControllerParser(
      nestjsConfig.publicDecorators ?? ['Public', 'SkipAuth']
    );

    const routes = this.parseControllers(
      allControllers,
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
   * 再帰的にモジュールを解析して全コントローラーを収集
   */
  private collectAllControllers(
    moduleInfo: { controllers: readonly ControllerRegistration[]; importedModules: readonly ModuleRegistration[] },
    project: Project,
    moduleParser: ModuleParser,
    visited: Set<string>,
    verbose: boolean
  ): ControllerRegistration[] {
    const controllers: ControllerRegistration[] = [...moduleInfo.controllers];

    const childControllers = moduleInfo.importedModules
      .filter(m => !visited.has(m.resolvedPath))
      .flatMap(m => this.processImportedModule(m, project, moduleParser, visited, verbose));

    return [...controllers, ...childControllers];
  }

  /**
   * インポートされたモジュールを処理
   */
  private processImportedModule(
    importedModule: ModuleRegistration,
    project: Project,
    moduleParser: ModuleParser,
    visited: Set<string>,
    verbose: boolean
  ): ControllerRegistration[] {
    visited.add(importedModule.resolvedPath);

    const moduleFile = project.getSourceFile(importedModule.resolvedPath);
    if (!moduleFile) {
      verbose && console.log(`[NestJSExtractor] Module file not found: ${importedModule.resolvedPath}`);
      return [];
    }

    const childModuleInfo = moduleParser.parseModule(moduleFile);
    return this.collectAllControllers(childModuleInfo, project, moduleParser, visited, verbose);
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
