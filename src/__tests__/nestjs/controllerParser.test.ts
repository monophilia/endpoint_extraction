import { describe, it, expect, beforeEach } from 'bun:test';
import { Project } from 'ts-morph';
import { ControllerParser } from '../../extractors/nestjs/controllerParser';
import {
  BASIC_CONTROLLER_FIXTURE,
  AUTH_CONTROLLER_FIXTURE,
  PUBLIC_ROUTE_FIXTURE,
  NESTED_PATH_FIXTURE,
} from '../fixtures/nestjs.fixture';

describe('ControllerParser', () => {
  let project: Project;
  let parser: ControllerParser;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
    parser = new ControllerParser();
  });

  describe('parseController', () => {
    it('コントローラーのベースパスを抽出する', () => {
      const sourceFile = project.createSourceFile('users.controller.ts', BASIC_CONTROLLER_FIXTURE);

      const result = parser.parseController(sourceFile);

      expect(result).toBeDefined();
      expect(result?.basePath).toBe('users');
      expect(result?.name).toBe('UsersController');
    });

    it('ネストされたパスを抽出する', () => {
      const sourceFile = project.createSourceFile('resources.controller.ts', NESTED_PATH_FIXTURE);

      const result = parser.parseController(sourceFile);

      expect(result?.basePath).toBe('api/v1/resources');
    });

    it('メソッド一覧を抽出する', () => {
      const sourceFile = project.createSourceFile('users.controller.ts', BASIC_CONTROLLER_FIXTURE);

      const result = parser.parseController(sourceFile);

      expect(result?.methods).toHaveLength(4);
      expect(result?.methods.map(m => m.name)).toEqual([
        'findAll', 'findOne', 'create', 'search'
      ]);
    });

    it('クラスレベルの@UseGuardsを抽出する', () => {
      const sourceFile = project.createSourceFile('protected.controller.ts', AUTH_CONTROLLER_FIXTURE);

      const result = parser.parseController(sourceFile);

      expect(result?.classGuards).toHaveLength(1);
      expect(result?.classGuards[0]!.guards).toContain('AuthGuard');
    });
  });

  describe('extractEndpoints', () => {
    it('全エンドポイントをEndpointInfo形式で抽出する', () => {
      const sourceFile = project.createSourceFile('users.controller.ts', BASIC_CONTROLLER_FIXTURE);
      const controller = parser.parseController(sourceFile)!;

      const endpoints = parser.extractEndpoints(controller, []);

      expect(endpoints).toHaveLength(4);

      // GET /users
      expect(endpoints[0]!.path).toBe('/users');
      expect(endpoints[0]!.method).toBe('GET');

      // GET /users/:id
      expect(endpoints[1]!.path).toBe('/users/:id');
      expect(endpoints[1]!.method).toBe('GET');
      expect(endpoints[1]!.pathParams).toHaveLength(1);

      // POST /users
      expect(endpoints[2]!.path).toBe('/users');
      expect(endpoints[2]!.method).toBe('POST');
      expect(endpoints[2]!.bodyParams.length).toBeGreaterThan(0);

      // GET /users/search
      expect(endpoints[3]!.path).toBe('/users/search');
      expect(endpoints[3]!.queryParams).toHaveLength(2);
    });

    it('パスを正しく結合する', () => {
      const sourceFile = project.createSourceFile('resources.controller.ts', NESTED_PATH_FIXTURE);
      const controller = parser.parseController(sourceFile)!;

      const endpoints = parser.extractEndpoints(controller, []);

      expect(endpoints[0]!.path).toBe('/api/v1/resources');
      expect(endpoints[1]!.path).toBe('/api/v1/resources/:id');
    });
  });
});
