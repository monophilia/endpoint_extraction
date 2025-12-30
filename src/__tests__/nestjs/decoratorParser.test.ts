import { describe, it, expect, beforeEach } from 'bun:test';
import { Project } from 'ts-morph';
import { DecoratorParser } from '../../extractors/nestjs/decoratorParser';
import { BASIC_CONTROLLER_FIXTURE } from '../fixtures/nestjs.fixture';

describe('DecoratorParser', () => {
  let project: Project;
  let parser: DecoratorParser;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
    parser = new DecoratorParser();
  });

  describe('parseMethodDecorators', () => {
    it('@Get()デコレーターを検出する', () => {
      const sourceFile = project.createSourceFile('test.ts', BASIC_CONTROLLER_FIXTURE);
      const classDecl = sourceFile.getClasses()[0];
      const method = classDecl.getMethod('findAll')!;

      const result = parser.parseMethodDecorator(method);

      expect(result).toBeDefined();
      expect(result?.type).toBe('Get');
      expect(result?.path).toBe('');
    });

    it('@Get(\':id\')のパスを抽出する', () => {
      const sourceFile = project.createSourceFile('test.ts', BASIC_CONTROLLER_FIXTURE);
      const classDecl = sourceFile.getClasses()[0];
      const method = classDecl.getMethod('findOne')!;

      const result = parser.parseMethodDecorator(method);

      expect(result).toBeDefined();
      expect(result?.type).toBe('Get');
      expect(result?.path).toBe(':id');
    });

    it('@Post()デコレーターを検出する', () => {
      const sourceFile = project.createSourceFile('test.ts', BASIC_CONTROLLER_FIXTURE);
      const classDecl = sourceFile.getClasses()[0];
      const method = classDecl.getMethod('create')!;

      const result = parser.parseMethodDecorator(method);

      expect(result).toBeDefined();
      expect(result?.type).toBe('Post');
    });

    it('HTTPメソッドデコレーターがないメソッドはnullを返す', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        class NoDecorator {
          normalMethod() {}
        }
      `);
      const classDecl = sourceFile.getClasses()[0];
      const method = classDecl.getMethod('normalMethod')!;

      const result = parser.parseMethodDecorator(method);

      expect(result).toBeNull();
    });
  });

  describe('parseParamDecorators', () => {
    it('@Param()デコレーターを検出する', () => {
      const sourceFile = project.createSourceFile('test.ts', BASIC_CONTROLLER_FIXTURE);
      const classDecl = sourceFile.getClasses()[0];
      const method = classDecl.getMethod('findOne')!;

      const result = parser.parseParamDecorators(method);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('Param');
      expect(result[0].argName).toBe('id');
      expect(result[0].paramName).toBe('id');
      expect(result[0].paramType).toBe('string');
    });

    it('@Body()デコレーターを検出する', () => {
      const sourceFile = project.createSourceFile('test.ts', BASIC_CONTROLLER_FIXTURE);
      const classDecl = sourceFile.getClasses()[0];
      const method = classDecl.getMethod('create')!;

      const result = parser.parseParamDecorators(method);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('Body');
      expect(result[0].paramName).toBe('createUserDto');
    });

    it('@Query()デコレーターを検出する', () => {
      const sourceFile = project.createSourceFile('test.ts', BASIC_CONTROLLER_FIXTURE);
      const classDecl = sourceFile.getClasses()[0];
      const method = classDecl.getMethod('search')!;

      const result = parser.parseParamDecorators(method);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('Query');
      expect(result[0].argName).toBe('name');
      expect(result[0].required).toBe(true);
      expect(result[1].argName).toBe('age');
      expect(result[1].required).toBe(false);
    });

    it('複数の@Param()を検出する', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        import { Controller, Get, Param } from '@nestjs/common';

        @Controller('groups/:groupId/users')
        export class GroupUsersController {
          @Get(':userId')
          getUser(
            @Param('groupId') groupId: string,
            @Param('userId') userId: string,
          ) {}
        }
      `);
      const classDecl = sourceFile.getClasses()[0];
      const method = classDecl.getMethods()[0];

      const result = parser.parseParamDecorators(method);

      expect(result).toHaveLength(2);
      expect(result[0].argName).toBe('groupId');
      expect(result[1].argName).toBe('userId');
    });
  });

  describe('parseGuardDecorators', () => {
    it('@UseGuards(AuthGuard)を検出する', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        import { Controller, Get, UseGuards } from '@nestjs/common';
        import { AuthGuard } from './auth.guard';

        @Controller('test')
        export class TestController {
          @Get()
          @UseGuards(AuthGuard)
          protected() {}
        }
      `);
      const classDecl = sourceFile.getClasses()[0];
      const method = classDecl.getMethods()[0];

      const result = parser.parseGuardDecorators(method);

      expect(result).toHaveLength(1);
      expect(result[0].guards).toContain('AuthGuard');
      expect(result[0].level).toBe('method');
    });

    it('複数ガードを検出する', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        import { Controller, Get, UseGuards } from '@nestjs/common';

        @Controller('test')
        export class TestController {
          @Get()
          @UseGuards(AuthGuard, RolesGuard)
          protected() {}
        }
      `);
      const classDecl = sourceFile.getClasses()[0];
      const method = classDecl.getMethods()[0];

      const result = parser.parseGuardDecorators(method);

      expect(result).toHaveLength(1);
      expect(result[0].guards).toContain('AuthGuard');
      expect(result[0].guards).toContain('RolesGuard');
    });
  });

  describe('parseMetadataDecorators', () => {
    it('@Public()デコレーターを検出する', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        import { Controller, Get } from '@nestjs/common';
        import { Public } from './public.decorator';

        @Controller('test')
        export class TestController {
          @Public()
          @Get()
          publicRoute() {}
        }
      `);
      const classDecl = sourceFile.getClasses()[0];
      const method = classDecl.getMethods()[0];

      const result = parser.parseMetadataDecorators(method, ['Public']);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Public');
    });

    it('@Roles()デコレーターの値を抽出する', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        import { Controller, Get } from '@nestjs/common';
        import { Roles } from './roles.decorator';

        @Controller('test')
        export class TestController {
          @Roles('admin', 'moderator')
          @Get()
          adminRoute() {}
        }
      `);
      const classDecl = sourceFile.getClasses()[0];
      const method = classDecl.getMethods()[0];

      const result = parser.parseMetadataDecorators(method, ['Roles']);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Roles');
      expect(result[0].value).toEqual(['admin', 'moderator']);
    });
  });
});
