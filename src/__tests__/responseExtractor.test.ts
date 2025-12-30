// src/__tests__/responseExtractor.test.ts

import { describe, test, expect } from 'bun:test';
import { Project, SourceFile, Node, SyntaxKind, ArrowFunction, FunctionExpression } from 'ts-morph';
import { ResponseExtractor } from '../extractors/fastify/responseExtractor';
import {
  SIMPLE_RETURN_FIXTURE,
  REPLY_SEND_FIXTURE,
  REPLY_CODE_SEND_FIXTURE,
  ERROR_RESPONSE_FIXTURE,
  MULTIPLE_ERRORS_FIXTURE,
  NO_RESPONSE_FIXTURE,
} from './fixtures/response.fixture';

/**
 * ヘルパー: コードからResponseExtractorを作成
 */
function createExtractorAndHandler(code: string): {
  extractor: ResponseExtractor;
  sourceFile: SourceFile;
} {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile('test.ts', code);
  const extractor = new ResponseExtractor(sourceFile);
  return { extractor, sourceFile };
}

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'];

/**
 * ヘルパー: ハンドラー関数を取得する
 */
function getHandlerFunction(sourceFile: SourceFile): ArrowFunction | FunctionExpression | null {
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const call of callExpressions) {
    const expr = call.getExpression();
    if (!Node.isPropertyAccessExpression(expr)) {
      continue;
    }

    const methodName = expr.getName();
    if (!HTTP_METHODS.includes(methodName)) {
      continue;
    }

    const args = call.getArguments();
    const lastArg = args[args.length - 1];

    if (Node.isArrowFunction(lastArg)) {
      return lastArg;
    }

    if (Node.isFunctionExpression(lastArg)) {
      return lastArg;
    }
  }

  return null;
}

describe('ResponseExtractor', () => {
  describe('return文からの抽出', () => {
    test('シンプルなreturn文から成功レスポンスを抽出する', () => {
      const { extractor, sourceFile } = createExtractorAndHandler(SIMPLE_RETURN_FIXTURE);
      const handler = getHandlerFunction(sourceFile);
      expect(handler).not.toBeNull();

      const responses = extractor.extractFromHandler(handler!);

      expect(responses.success).toHaveLength(1);
      expect(responses.success[0].code).toBe(200);
      expect(responses.success[0].source).toBe('return');
      expect(responses.success[0].dataType).toContainEqual(
        expect.objectContaining({ name: 'users' })
      );
      expect(responses.success[0].dataType).toContainEqual(
        expect.objectContaining({ name: 'total' })
      );
    });
  });

  describe('reply.send()からの抽出', () => {
    test('reply.send()から成功レスポンスを抽出する', () => {
      const { extractor, sourceFile } = createExtractorAndHandler(REPLY_SEND_FIXTURE);
      const handler = getHandlerFunction(sourceFile);
      expect(handler).not.toBeNull();

      const responses = extractor.extractFromHandler(handler!);

      expect(responses.success).toHaveLength(1);
      expect(responses.success[0].code).toBe(200);
      expect(responses.success[0].source).toBe('reply.send');
    });
  });

  describe('reply.code().send()からの抽出', () => {
    test('reply.code(201).send()から成功レスポンスを抽出する', () => {
      const { extractor, sourceFile } = createExtractorAndHandler(REPLY_CODE_SEND_FIXTURE);
      const handler = getHandlerFunction(sourceFile);
      expect(handler).not.toBeNull();

      const responses = extractor.extractFromHandler(handler!);

      expect(responses.success).toHaveLength(1);
      expect(responses.success[0].code).toBe(201);
      expect(responses.success[0].source).toBe('reply.code');
    });

    test('reply.code(404).send()からエラーレスポンスを抽出する', () => {
      const { extractor, sourceFile } = createExtractorAndHandler(ERROR_RESPONSE_FIXTURE);
      const handler = getHandlerFunction(sourceFile);
      expect(handler).not.toBeNull();

      const responses = extractor.extractFromHandler(handler!);

      expect(responses.errors).toHaveLength(1);
      expect(responses.errors[0].code).toBe(404);
      expect(responses.errors[0].message).toBe('User not found');
    });
  });

  describe('複数エラーパターン', () => {
    test('複数のエラーレスポンスを抽出する', () => {
      const { extractor, sourceFile } = createExtractorAndHandler(MULTIPLE_ERRORS_FIXTURE);
      const handler = getHandlerFunction(sourceFile);
      expect(handler).not.toBeNull();

      const responses = extractor.extractFromHandler(handler!);

      expect(responses.success).toHaveLength(1);
      expect(responses.success[0].code).toBe(200);

      expect(responses.errors).toHaveLength(2);
      expect(responses.errors.map(e => e.code)).toContain(404);
      expect(responses.errors.map(e => e.code)).toContain(401);
    });

    test('messageプロパティからエラーメッセージを抽出する', () => {
      const { extractor, sourceFile } = createExtractorAndHandler(MULTIPLE_ERRORS_FIXTURE);
      const handler = getHandlerFunction(sourceFile);
      expect(handler).not.toBeNull();

      const responses = extractor.extractFromHandler(handler!);

      const notFoundError = responses.errors.find(e => e.code === 404);
      expect(notFoundError?.message).toBe('User not found');

      const authError = responses.errors.find(e => e.code === 401);
      expect(authError?.message).toBe('Invalid password');
    });
  });

  describe('エッジケース', () => {
    test('レスポンスなし（204 No Content）', () => {
      const { extractor, sourceFile } = createExtractorAndHandler(NO_RESPONSE_FIXTURE);
      const handler = getHandlerFunction(sourceFile);
      expect(handler).not.toBeNull();

      const responses = extractor.extractFromHandler(handler!);

      expect(responses.success).toHaveLength(1);
      expect(responses.success[0].code).toBe(204);
      expect(responses.success[0].dataType).toHaveLength(0);
    });
  });

  describe('エラーメッセージ抽出', () => {
    test('リテラル文字列のmessageを抽出する', () => {
      const { extractor, sourceFile } = createExtractorAndHandler(ERROR_RESPONSE_FIXTURE);
      const handler = getHandlerFunction(sourceFile);
      expect(handler).not.toBeNull();

      const responses = extractor.extractFromHandler(handler!);

      expect(responses.errors[0].message).toBe('User not found');
    });
  });
});
