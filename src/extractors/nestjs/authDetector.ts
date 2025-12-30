// src/extractors/nestjs/authDetector.ts

import type {
  ControllerInfo,
  ControllerMethodInfo,
  EndpointAuth,
  DetectedGuard,
  NestJSAuthConfigFile,
} from '../../types';
import type { GuardAnalyzer } from './guardAnalyzer';

export class NestJSAuthDetector {
  constructor(
    private readonly config: NestJSAuthConfigFile,
    private readonly guardAnalyzer: GuardAnalyzer,
  ) {}

  /**
   * メソッドの認証要否を判定
   */
  detectAuth(
    controller: ControllerInfo,
    method: ControllerMethodInfo,
    globalGuards: readonly string[]
  ): EndpointAuth {
    // 1. @Publicチェック（最優先）
    if (this.isPublicRoute(controller, method)) {
      return {
        required: false,
        confidence: 'high',
        guards: [],
      };
    }

    // 2. ガード収集と判定
    const detectedGuards = this.collectAndAnalyzeGuards(
      controller,
      method,
      globalGuards
    );

    // 3. 認証ガードの存在チェック
    const authGuards = detectedGuards.filter(g => g.isAuthGuard);
    const hasAuthGuard = authGuards.length > 0;

    // 4. 確信度を計算
    const confidence = this.calculateConfidence(detectedGuards);

    return {
      required: hasAuthGuard ? true : (detectedGuards.length === 0 ? 'unknown' : false),
      confidence,
      guards: detectedGuards,
    };
  }

  /**
   * @Publicデコレーターの有無をチェック
   */
  private isPublicRoute(
    controller: ControllerInfo,
    method: ControllerMethodInfo
  ): boolean {
    // メソッドレベルのメタデータをチェック
    for (const meta of method.metadata) {
      if (this.config.publicDecorators?.includes(meta.name)) {
        return true;
      }
      if (this.config.publicMetadataKeys?.includes(meta.key)) {
        return true;
      }
    }

    // クラスレベルのメタデータをチェック
    for (const meta of controller.classMetadata) {
      if (this.config.publicDecorators?.includes(meta.name)) {
        return true;
      }
    }

    return false;
  }

  /**
   * ガードを収集し、各ガードが認証ガードかを判定
   */
  private collectAndAnalyzeGuards(
    controller: ControllerInfo,
    method: ControllerMethodInfo,
    globalGuards: readonly string[]
  ): readonly DetectedGuard[] {
    const results: DetectedGuard[] = [];

    // グローバルガード
    for (const guardName of globalGuards) {
      const result = this.guardAnalyzer.isAuthGuard(guardName, null, this.config);
      results.push({
        name: guardName,
        level: 'global',
        isAuthGuard: result.isAuth,
        reason: result.reason,
      });
    }

    // クラスレベルのガード
    for (const guardInfo of controller.classGuards) {
      for (const guardName of guardInfo.guards) {
        const result = this.guardAnalyzer.isAuthGuard(guardName, null, this.config);
        results.push({
          name: guardName,
          level: 'class',
          isAuthGuard: result.isAuth,
          reason: result.reason,
        });
      }
    }

    // メソッドレベルのガード
    for (const guardInfo of method.guards) {
      for (const guardName of guardInfo.guards) {
        const result = this.guardAnalyzer.isAuthGuard(guardName, null, this.config);
        results.push({
          name: guardName,
          level: 'method',
          isAuthGuard: result.isAuth,
          reason: result.reason,
        });
      }
    }

    return results;
  }

  /**
   * 判定の確信度を計算
   */
  private calculateConfidence(
    guards: readonly DetectedGuard[]
  ): 'high' | 'medium' | 'low' {
    if (guards.length === 0) {
      return 'low';
    }

    const hasUnknown = guards.some(g => g.reason === 'unknown');
    const allHighConfidence = guards.every(
      g => g.reason === 'config' || g.reason === 'inheritance' || g.reason === 'excluded'
    );

    if (allHighConfidence) {
      return 'high';
    }
    if (hasUnknown) {
      return 'low';
    }
    return 'medium';
  }
}
