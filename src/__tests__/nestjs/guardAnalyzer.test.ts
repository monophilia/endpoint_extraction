import { describe, it, expect, beforeEach } from 'bun:test';
import { Project } from 'ts-morph';
import { GuardAnalyzer } from '../../extractors/nestjs/guardAnalyzer';
import type { NestJSAuthConfigFile } from '../../types/config';
import {
  JWT_AUTH_GUARD_FIXTURE,
  CUSTOM_AUTH_GUARD_FIXTURE,
  THROTTLE_GUARD_FIXTURE,
  ROLES_GUARD_FIXTURE,
} from '../fixtures/guards.fixture';

describe('GuardAnalyzer', () => {
  let project: Project;
  let analyzer: GuardAnalyzer;
  let defaultConfig: NestJSAuthConfigFile;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
    analyzer = new GuardAnalyzer(project);
    defaultConfig = {
      guardPatterns: ['.*AuthGuard$'],
      authGuards: [],
      excludeGuards: ['ThrottlerGuard', 'RateLimitGuard'],
      publicDecorators: ['Public'],
      publicMetadataKeys: ['isPublic'],
    };
  });

  describe('isAuthGuard', () => {
    it('AuthGuard継承クラスを認証ガードとして検出する', () => {
      const sourceFile = project.createSourceFile('jwt-auth.guard.ts', JWT_AUTH_GUARD_FIXTURE);
      const guardClass = sourceFile.getClasses()[0];

      const result = analyzer.isAuthGuard('JwtAuthGuard', guardClass, defaultConfig);

      expect(result.isAuth).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.reason).toBe('inheritance');
    });

    it('除外リストに含まれるガードは認証ガードではない', () => {
      const sourceFile = project.createSourceFile('throttle.guard.ts', THROTTLE_GUARD_FIXTURE);
      const guardClass = sourceFile.getClasses()[0];

      const result = analyzer.isAuthGuard('ThrottlerGuard', guardClass, defaultConfig);

      expect(result.isAuth).toBe(false);
      expect(result.confidence).toBe('high');
      expect(result.reason).toBe('excluded');
    });

    it('パターンマッチで認証ガードを検出する', () => {
      const result = analyzer.isAuthGuard('CustomAuthGuard', null, defaultConfig);

      expect(result.isAuth).toBe(true);
      expect(result.confidence).toBe('medium');
      expect(result.reason).toBe('pattern');
    });

    it('設定ファイルで明示指定されたガードを検出する', () => {
      const config: NestJSAuthConfigFile = {
        ...defaultConfig,
        authGuards: ['MySpecialGuard'],
      };

      const result = analyzer.isAuthGuard('MySpecialGuard', null, config);

      expect(result.isAuth).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.reason).toBe('config');
    });

    it('判定できないガードはconfidence: lowを返す', () => {
      const result = analyzer.isAuthGuard('UnknownGuard', null, defaultConfig);

      expect(result.isAuth).toBe(false);
      expect(result.confidence).toBe('low');
      expect(result.reason).toBe('unknown');
    });
  });

  describe('checkAuthGuardInheritance', () => {
    it('直接AuthGuard継承を検出する', () => {
      const sourceFile = project.createSourceFile('jwt-auth.guard.ts', JWT_AUTH_GUARD_FIXTURE);
      const guardClass = sourceFile.getClasses()[0];

      const result = analyzer.checkAuthGuardInheritance(guardClass);

      expect(result).toBe(true);
    });

    it('CanActivate実装のみのガードは継承なし', () => {
      const sourceFile = project.createSourceFile('throttle.guard.ts', THROTTLE_GUARD_FIXTURE);
      const guardClass = sourceFile.getClasses()[0];

      const result = analyzer.checkAuthGuardInheritance(guardClass);

      expect(result).toBe(false);
    });
  });
});
