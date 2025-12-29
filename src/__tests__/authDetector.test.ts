// src/__tests__/authDetector.test.ts

import { describe, test, expect } from 'bun:test';
import { Project, SyntaxKind } from 'ts-morph';
import { AuthDetector } from '../extractors/fastify/authDetector';

const createTestArgs = (source: string) => {
  const project = new Project();
  const sourceFile = project.createSourceFile('test.ts', source);
  const callExpr = sourceFile.getFirstDescendantByKind(SyntaxKind.CallExpression);
  return callExpr?.getArguments() ?? [];
};

describe('AuthDetector', () => {
  describe('detect', () => {
    test('preHandlerで認証検出', () => {
      const args = createTestArgs(`
        app.get('/users', { preHandler: [tokenVerification] }, handler);
      `);

      const authDetector = new AuthDetector({
        middlewareNames: ['tokenVerification'],
        hookPoints: ['preHandler', 'onRequest', 'preValidation'],
      });

      const authInfo = authDetector.detect(args);

      expect(authInfo.required).toBe(true);
      expect(authInfo.middlewares).toContain('tokenVerification');
      expect(authInfo.hookPoint).toBe('preHandler');
    });

    test('onRequestで認証検出', () => {
      const args = createTestArgs(`
        app.get('/users', { onRequest: [authGuard] }, handler);
      `);

      const authDetector = new AuthDetector({
        middlewareNames: ['authGuard'],
        hookPoints: ['preHandler', 'onRequest', 'preValidation'],
      });

      const authInfo = authDetector.detect(args);

      expect(authInfo.required).toBe(true);
      expect(authInfo.middlewares).toContain('authGuard');
      expect(authInfo.hookPoint).toBe('onRequest');
    });

    test('preValidationで認証検出', () => {
      const args = createTestArgs(`
        app.post('/data', { preValidation: [authenticate] }, handler);
      `);

      const authDetector = new AuthDetector({
        middlewareNames: ['authenticate'],
        hookPoints: ['preHandler', 'onRequest', 'preValidation'],
      });

      const authInfo = authDetector.detect(args);

      expect(authInfo.required).toBe(true);
      expect(authInfo.middlewares).toContain('authenticate');
      expect(authInfo.hookPoint).toBe('preValidation');
    });

    test('認証ミドルウェアがない場合はrequired: false', () => {
      const args = createTestArgs(`
        app.get('/public', { preHandler: [rateLimiter] }, handler);
      `);

      const authDetector = new AuthDetector({
        middlewareNames: ['tokenVerification', 'authGuard'],
        hookPoints: ['preHandler', 'onRequest'],
      });

      const authInfo = authDetector.detect(args);

      expect(authInfo.required).toBe(false);
      expect(authInfo.middlewares).toHaveLength(0);
      expect(authInfo.hookPoint).toBeUndefined();
    });

    test('オプションオブジェクトがない場合はrequired: false', () => {
      const args = createTestArgs(`
        app.get('/simple', handler);
      `);

      const authDetector = new AuthDetector({
        middlewareNames: ['tokenVerification'],
        hookPoints: ['preHandler'],
      });

      const authInfo = authDetector.detect(args);

      expect(authInfo.required).toBe(false);
      expect(authInfo.middlewares).toHaveLength(0);
    });

    test('部分一致で認証ミドルウェアを検出', () => {
      const args = createTestArgs(`
        app.get('/users', { preHandler: [customTokenVerificationMiddleware] }, handler);
      `);

      const authDetector = new AuthDetector({
        middlewareNames: ['tokenVerification'],
        hookPoints: ['preHandler'],
      });

      const authInfo = authDetector.detect(args);

      expect(authInfo.required).toBe(true);
      expect(authInfo.middlewares).toContain('customTokenVerificationMiddleware');
    });

    test('大文字小文字を無視して検出', () => {
      const args = createTestArgs(`
        app.get('/users', { preHandler: [TOKENVERIFICATION] }, handler);
      `);

      const authDetector = new AuthDetector({
        middlewareNames: ['tokenVerification'],
        hookPoints: ['preHandler'],
      });

      const authInfo = authDetector.detect(args);

      expect(authInfo.required).toBe(true);
      expect(authInfo.middlewares).toContain('TOKENVERIFICATION');
    });

    test('複数フックがある場合は最初に見つかったものを返す', () => {
      const args = createTestArgs(`
        app.get('/admin', {
          onRequest: [authenticate],
          preHandler: [adminOnly]
        }, handler);
      `);

      const authDetector = new AuthDetector({
        middlewareNames: ['authenticate', 'adminOnly'],
        hookPoints: ['preHandler', 'onRequest'],
      });

      const authInfo = authDetector.detect(args);

      // hookPointsの順序通り、preHandlerが先にチェックされる
      expect(authInfo.required).toBe(true);
      expect(authInfo.hookPoint).toBe('preHandler');
    });
  });

  describe('isAuthMiddleware', () => {
    test('設定されたミドルウェア名にマッチする', () => {
      const authDetector = new AuthDetector({
        middlewareNames: ['tokenVerification', 'authGuard'],
        hookPoints: ['preHandler'],
      });

      expect(authDetector.isAuthMiddleware('tokenVerification')).toBe(true);
      expect(authDetector.isAuthMiddleware('authGuard')).toBe(true);
      expect(authDetector.isAuthMiddleware('rateLimiter')).toBe(false);
    });

    test('部分一致でマッチする', () => {
      const authDetector = new AuthDetector({
        middlewareNames: ['auth'],
        hookPoints: ['preHandler'],
      });

      expect(authDetector.isAuthMiddleware('authMiddleware')).toBe(true);
      expect(authDetector.isAuthMiddleware('myAuthGuard')).toBe(true);
      expect(authDetector.isAuthMiddleware('tokenVerification')).toBe(false);
    });
  });
});
