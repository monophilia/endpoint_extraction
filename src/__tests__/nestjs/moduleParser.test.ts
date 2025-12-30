import { describe, it, expect, beforeEach } from 'bun:test';
import { Project } from 'ts-morph';
import { ModuleParser } from '../../extractors/nestjs/moduleParser';
import {
  MODULE_FIXTURE,
  MODULE_NO_GUARD_FIXTURE,
} from '../fixtures/nestjs.fixture';

describe('ModuleParser', () => {
  let project: Project;
  let parser: ModuleParser;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
    parser = new ModuleParser();
  });

  describe('parseModule', () => {
    it('コントローラー登録を検出する', () => {
      const sourceFile = project.createSourceFile('app.module.ts', MODULE_FIXTURE);

      const result = parser.parseModule(sourceFile);

      expect(result.controllers).toHaveLength(2);
      expect(result.controllers.map(c => c.name)).toEqual([
        'UsersController', 'AuthController'
      ]);
    });

    it('APP_GUARDを検出する', () => {
      const sourceFile = project.createSourceFile('app.module.ts', MODULE_FIXTURE);

      const result = parser.parseModule(sourceFile);

      expect(result.globalGuards).toHaveLength(1);
      expect(result.globalGuards[0]).toBe('AuthGuard');
    });

    it('APP_GUARDがない場合は空配列を返す', () => {
      const sourceFile = project.createSourceFile('app.module.ts', MODULE_NO_GUARD_FIXTURE);

      const result = parser.parseModule(sourceFile);

      expect(result.globalGuards).toHaveLength(0);
    });

    it('コントローラーのインポートパスを解決する', () => {
      const sourceFile = project.createSourceFile('app.module.ts', MODULE_FIXTURE);

      const result = parser.parseModule(sourceFile);

      expect(result.controllers[0].importPath).toBe('./users.controller');
    });
  });
});
