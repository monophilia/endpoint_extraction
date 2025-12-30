// src/extractors/fastify/responseExtractor.ts

import {
  SourceFile,
  Node,
  SyntaxKind,
  ArrowFunction,
  FunctionExpression,
  CallExpression,
} from 'ts-morph';
import type {
  EndpointResponses,
  ResponseInfo,
  ErrorResponseInfo,
  ParamInfo,
  ResponseSource,
} from '../../types';
import { TypeExtractor } from '../../core/typeExtractor';

export class ResponseExtractor {
  private readonly typeExtractor: TypeExtractor;
  private readonly typeCache = new Map<Node, readonly ParamInfo[]>();

  constructor(private readonly sourceFile: SourceFile) {
    this.typeExtractor = new TypeExtractor(sourceFile);
  }

  /**
   * ハンドラー関数からレスポンス情報を抽出
   */
  extractFromHandler(handlerNode: ArrowFunction | FunctionExpression): EndpointResponses {
    const successResponses: ResponseInfo[] = [];
    const errorResponses: ErrorResponseInfo[] = [];

    handlerNode.forEachDescendant(node => {
      const kind = node.getKind();

      if (kind === SyntaxKind.ReturnStatement) {
        this.processReturnStatement(node, successResponses);
        return;
      }

      if (kind === SyntaxKind.CallExpression) {
        this.processCallExpression(node, successResponses, errorResponses);
        return;
      }
    });

    return {
      success: this.deduplicateResponses(successResponses),
      errors: this.deduplicateErrors(errorResponses),
    };
  }

  /**
   * return文からレスポンスを抽出
   */
  private processReturnStatement(
    node: Node,
    responses: ResponseInfo[]
  ): void {
    if (!Node.isReturnStatement(node)) {
      return;
    }

    const expr = node.getExpression();
    if (!expr) {
      return;
    }

    const dataType = this.extractTypeFromExpression(expr);
    responses.push({
      code: 200,
      dataType,
      source: 'return',
      lineNumber: node.getStartLineNumber(),
    });
  }

  /**
   * reply.send() / reply.code().send() を処理
   */
  private processCallExpression(
    node: Node,
    successResponses: ResponseInfo[],
    errorResponses: ErrorResponseInfo[]
  ): void {
    if (!Node.isCallExpression(node)) {
      return;
    }

    const sendInfo = this.parseSendCall(node);
    if (!sendInfo) {
      return;
    }

    const { code, dataType, lineNumber, source, dataNode } = sendInfo;

    if (code >= 400) {
      const message = this.extractErrorMessageFromNode(dataNode) ?? this.extractErrorMessage(dataType);
      errorResponses.push({
        code,
        message,
        dataType: dataType.filter(p => p.name !== 'error' && p.name !== 'message'),
        lineNumber,
      });
      return;
    }

    successResponses.push({
      code,
      dataType,
      source,
      lineNumber,
    });
  }

  /**
   * reply.send(data) または reply.code(xxx).send(data) パターンを解析
   */
  private parseSendCall(call: CallExpression): {
    code: number;
    dataType: readonly ParamInfo[];
    lineNumber: number;
    source: ResponseSource;
    dataNode: Node | null;
  } | null {
    const expr = call.getExpression();

    if (!Node.isPropertyAccessExpression(expr)) {
      return null;
    }

    const methodName = expr.getName();
    if (methodName !== 'send') {
      return null;
    }

    const object = expr.getExpression();

    // reply.send(data) パターン
    if (Node.isIdentifier(object) && object.getText() === 'reply') {
      const args = call.getArguments();
      const firstArg = args[0];
      const dataNode = firstArg ?? null;
      const dataType = dataNode ? this.extractTypeFromExpression(dataNode) : [];
      return {
        code: 200,
        dataType,
        lineNumber: call.getStartLineNumber(),
        source: 'reply.send',
        dataNode,
      };
    }

    // reply.code(xxx).send(data) パターン
    if (Node.isCallExpression(object)) {
      return this.parseCodeSendChain(object, call);
    }

    return null;
  }

  /**
   * reply.code(xxx).send(data) チェーンを解析
   */
  private parseCodeSendChain(
    codeCall: CallExpression,
    sendCall: CallExpression
  ): {
    code: number;
    dataType: readonly ParamInfo[];
    lineNumber: number;
    source: ResponseSource;
    dataNode: Node | null;
  } | null {
    const codeExpr = codeCall.getExpression();

    if (!Node.isPropertyAccessExpression(codeExpr)) {
      return null;
    }

    const methodName = codeExpr.getName();
    if (methodName !== 'code' && methodName !== 'status') {
      return null;
    }

    const codeArgs = codeCall.getArguments();
    const codeArg = codeArgs[0];
    if (!codeArg) {
      return null;
    }

    const code = this.resolveStatusCode(codeArg);
    if (code === null) {
      return null;
    }

    const sendArgs = sendCall.getArguments();
    const firstSendArg = sendArgs[0];
    const dataNode = firstSendArg ?? null;
    const dataType = dataNode ? this.extractTypeFromExpression(dataNode) : [];

    return {
      code,
      dataType,
      lineNumber: sendCall.getStartLineNumber(),
      source: 'reply.code',
      dataNode,
    };
  }

  /**
   * ステータスコードを解決（リテラルまたは変数）
   */
  private resolveStatusCode(node: Node): number | null {
    // NumericLiteral: 直接値を取得
    if (Node.isNumericLiteral(node)) {
      return parseInt(node.getText(), 10);
    }

    // Identifier: 変数定義を追跡
    if (Node.isIdentifier(node)) {
      return this.resolveVariableValue(node);
    }

    return null;
  }

  /**
   * 変数から数値を解決（Phase 2: 変数追跡）
   */
  private resolveVariableValue(node: Node): number | null {
    if (!Node.isIdentifier(node)) {
      return null;
    }

    const definitions = node.getDefinitionNodes();
    for (const def of definitions) {
      if (!Node.isVariableDeclaration(def)) {
        continue;
      }

      const initializer = def.getInitializer();
      if (!initializer) {
        continue;
      }

      if (Node.isNumericLiteral(initializer)) {
        return parseInt(initializer.getText(), 10);
      }
    }

    return null;
  }

  /**
   * 式から型情報を抽出
   */
  private extractTypeFromExpression(expr: Node): readonly ParamInfo[] {
    const cached = this.typeCache.get(expr);
    if (cached) {
      return cached;
    }

    const type = expr.getType();
    const result = this.typeExtractor.extractProperties(type);
    this.typeCache.set(expr, result);
    return result;
  }

  /**
   * ASTノードから直接エラーメッセージを抽出
   */
  private extractErrorMessageFromNode(node: Node | null): string | null {
    if (!node) {
      return null;
    }

    // 変数参照の場合、定義を追跡（Phase 2）
    if (Node.isIdentifier(node)) {
      const resolved = this.resolveVariableExpression(node);
      return resolved ? this.extractErrorMessageFromNode(resolved) : null;
    }

    if (!Node.isObjectLiteralExpression(node)) {
      return null;
    }

    const properties = node.getProperties();
    for (const prop of properties) {
      if (!Node.isPropertyAssignment(prop)) {
        continue;
      }

      const propName = prop.getName();
      if (propName !== 'message') {
        continue;
      }

      const initializer = prop.getInitializer();
      if (!initializer) {
        continue;
      }

      if (Node.isStringLiteral(initializer)) {
        return initializer.getLiteralValue();
      }
    }

    return null;
  }

  /**
   * 変数から式を解決（Phase 2: 変数追跡）
   */
  private resolveVariableExpression(node: Node): Node | null {
    if (!Node.isIdentifier(node)) {
      return null;
    }

    const definitions = node.getDefinitionNodes();
    for (const def of definitions) {
      if (!Node.isVariableDeclaration(def)) {
        continue;
      }

      const initializer = def.getInitializer();
      if (initializer) {
        return initializer;
      }
    }

    return null;
  }

  /**
   * 型情報からエラーメッセージを抽出（フォールバック）
   */
  private extractErrorMessage(dataType: readonly ParamInfo[]): string {
    const messageProp = dataType.find(p => p.name === 'message');
    if (!messageProp) {
      return 'string';
    }

    const typeValue = messageProp.type;
    if (typeValue.startsWith("'") && typeValue.endsWith("'")) {
      return typeValue.slice(1, -1);
    }

    return typeValue;
  }

  /**
   * 成功レスポンスの重複を除去
   */
  private deduplicateResponses(responses: readonly ResponseInfo[]): readonly ResponseInfo[] {
    const seen = new Set<string>();
    const result: ResponseInfo[] = [];

    for (const response of responses) {
      const key = `${response.code}-${response.lineNumber}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(response);
    }

    return result;
  }

  /**
   * エラーレスポンスの重複を除去
   */
  private deduplicateErrors(errors: readonly ErrorResponseInfo[]): readonly ErrorResponseInfo[] {
    const seen = new Set<string>();
    const result: ErrorResponseInfo[] = [];

    for (const error of errors) {
      const key = `${error.code}-${error.lineNumber}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(error);
    }

    return result;
  }
}
