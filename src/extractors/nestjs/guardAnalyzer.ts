import { ClassDeclaration, Project } from 'ts-morph';
import type { AuthGuardResult, NestJSAuthConfigFile } from '../../types';

export class GuardAnalyzer {
  private readonly authGuardCache = new Map<string, boolean>();
  private readonly project: Project;

  constructor(project: Project) {
    this.project = project;
  }

  /**
   * ガードが認証ガードかどうかを判定
   */
  isAuthGuard(
    guardName: string,
    guardClass: ClassDeclaration | null,
    config: NestJSAuthConfigFile,
  ): AuthGuardResult {
    // 1. 除外リストに含まれている場合
    if (config.excludeGuards?.includes(guardName)) {
      return { isAuth: false, confidence: 'high', reason: 'excluded' };
    }

    // 2. 明示的に認証ガードとして指定されている場合
    if (config.authGuards?.includes(guardName)) {
      return { isAuth: true, confidence: 'high', reason: 'config' };
    }

    // 3. AuthGuard継承チェック（パターンマッチより優先）
    const inheritanceResult = this.checkInheritance(guardName, guardClass);
    if (inheritanceResult) {
      return inheritanceResult;
    }

    // 4. パターンマッチ
    const patternResult = this.checkPatternMatch(guardName, config.guardPatterns ?? []);
    if (patternResult) {
      return patternResult;
    }

    // 5. 判定不能
    return { isAuth: false, confidence: 'low', reason: 'unknown' };
  }

  /**
   * 継承チェックを実行し、結果を返す
   */
  private checkInheritance(
    guardName: string,
    guardClass: ClassDeclaration | null,
  ): AuthGuardResult | null {
    const targetClass = guardClass ?? this.findGuardClass(guardName);
    if (!targetClass) {
      return null;
    }

    const inheritsAuthGuard = this.checkAuthGuardInheritance(targetClass);
    if (!inheritsAuthGuard) {
      return null;
    }

    return { isAuth: true, confidence: 'high', reason: 'inheritance' };
  }

  /**
   * パターンマッチによる判定
   */
  private checkPatternMatch(
    guardName: string,
    patterns: readonly string[],
  ): AuthGuardResult | null {
    for (const pattern of patterns) {
      if (new RegExp(pattern).test(guardName)) {
        return { isAuth: true, confidence: 'medium', reason: 'pattern' };
      }
    }
    return null;
  }

  /**
   * AuthGuard継承をチェック
   */
  checkAuthGuardInheritance(guardClass: ClassDeclaration): boolean {
    const guardName = guardClass.getName();
    if (!guardName) return false;

    // キャッシュ確認
    if (this.authGuardCache.has(guardName)) {
      return this.authGuardCache.get(guardName)!;
    }

    // 継承チェーン解析
    const result = this.analyzeInheritanceChain(guardClass);
    this.authGuardCache.set(guardName, result);
    return result;
  }

  /**
   * プロジェクト内からガードクラスを探す
   */
  private findGuardClass(guardName: string): ClassDeclaration | null {
    const sourceFiles = this.project.getSourceFiles();

    for (const sourceFile of sourceFiles) {
      const classes = sourceFile.getClasses();
      for (const classDecl of classes) {
        if (classDecl.getName() === guardName) {
          return classDecl;
        }
      }
    }

    return null;
  }

  /**
   * 継承チェーンを解析
   */
  private analyzeInheritanceChain(guardClass: ClassDeclaration): boolean {
    // extends句を取得
    const extendsExpr = guardClass.getExtends();
    if (!extendsExpr) return false;

    const extendsText = extendsExpr.getText();

    // AuthGuard('xxx') パターン
    if (extendsText.startsWith('AuthGuard(')) {
      return true;
    }

    // AuthGuard を直接継承
    if (extendsText === 'AuthGuard') {
      return true;
    }

    // 間接継承をチェック（親クラスを解析）
    const baseClassName = this.extractClassName(extendsText);
    if (!baseClassName) return false;

    const baseClass = this.findGuardClass(baseClassName);
    if (!baseClass) return false;

    // 再帰的にチェック（キャッシュ経由）
    return this.checkAuthGuardInheritance(baseClass);
  }

  /**
   * 継承式からクラス名を抽出
   */
  private extractClassName(extendsText: string): string | null {
    // AuthGuard('jwt') -> null (既にチェック済み)
    if (extendsText.includes('(')) {
      return null;
    }
    // JwtAuthGuard -> JwtAuthGuard
    return extendsText.trim();
  }
}
