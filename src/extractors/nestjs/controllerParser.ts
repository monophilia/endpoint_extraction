// src/extractors/nestjs/controllerParser.ts

import { SourceFile, ClassDeclaration } from 'ts-morph';
import type {
  ControllerInfo,
  ControllerMethodInfo,
  ParamDecoratorInfo,
  MethodDecoratorType,
} from '../../types/nestjs';
import type { EndpointInfo } from '../../types/endpoint';
import type { ParamInfo } from '../../types/param';
import type { HttpMethod } from '../../types/http';

/**
 * HTTPメソッドマップ（ローカル定義）
 */
const HTTP_METHOD_MAP: Record<MethodDecoratorType, HttpMethod | 'OPTIONS' | 'HEAD' | 'ALL'> = {
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Delete: 'DELETE',
  Patch: 'PATCH',
  Options: 'OPTIONS',
  Head: 'HEAD',
  All: 'ALL',
} as const;

/**
 * コントローラークラスの解析を担当
 */
export class ControllerParser {
  private readonly publicDecorators: readonly string[];

  constructor(publicDecorators: readonly string[] = ['Public', 'SkipAuth']) {
    this.publicDecorators = publicDecorators;
  }

  /**
   * ソースファイルからコントローラー情報を抽出
   */
  parseController(sourceFile: SourceFile): ControllerInfo | null {
    const classes = sourceFile.getClasses();

    for (const classDecl of classes) {
      if (!classDecl.getDecorator('Controller')) {
        continue;
      }

      return this.parseControllerClass(classDecl, sourceFile.getFilePath());
    }

    return null;
  }

  /**
   * コントローラークラスを解析
   */
  private parseControllerClass(
    classDecl: ClassDeclaration,
    sourceFilePath: string
  ): ControllerInfo {
    // DecoratorParserは後続タスクで実装されるため、一旦仮実装
    const basePath = this.extractControllerPath(classDecl);
    const classGuards = []; // DecoratorParser実装後に対応
    const classMetadata = []; // DecoratorParser実装後に対応

    const methods = this.parseMethods(classDecl);

    return {
      name: classDecl.getName() ?? 'AnonymousController',
      basePath,
      classGuards,
      classMetadata,
      methods,
      sourceFile: sourceFilePath,
      lineNumber: classDecl.getStartLineNumber(),
    };
  }

  /**
   * @Controller('path')からパスを抽出（仮実装）
   */
  private extractControllerPath(classDecl: ClassDeclaration): string {
    const decorator = classDecl.getDecorator('Controller');
    if (!decorator) {
      return '';
    }

    const args = decorator.getArguments();
    if (args.length === 0) {
      return '';
    }

    const arg = args[0];
    return arg.getText().replace(/['"]/g, '');
  }

  /**
   * コントローラーのメソッドを解析
   */
  private parseMethods(classDecl: ClassDeclaration): readonly ControllerMethodInfo[] {
    const methods = classDecl.getMethods();
    const results: ControllerMethodInfo[] = [];

    for (const method of methods) {
      // DecoratorParser実装後に対応
      // 一旦、HTTPメソッドデコレーターを持つメソッドをスキップ
      // 将来的にはdecoratorParser.parseMethodDecorator(method)で実装

      // 仮実装: メソッドをスキップ
      continue;
    }

    return results;
  }

  /**
   * EndpointInfo形式に変換
   *
   * @param controller コントローラー情報
   * @param globalGuards グローバルガード一覧
   * @param authDetector 認証検出器（後続タスクで実装）
   */
  extractEndpoints(
    controller: ControllerInfo,
    globalGuards: readonly string[],
    authDetector?: unknown // AuthDetectorは後続タスクで実装
  ): readonly EndpointInfo[] {
    return controller.methods.map(method => {
      const fullPath = this.joinPaths(controller.basePath, method.httpMethod.path);
      const httpMethod = this.convertHttpMethod(method.httpMethod.type);

      return {
        path: fullPath,
        method: httpMethod,
        pathParams: this.extractPathParams(method.params),
        queryParams: this.extractQueryParams(method.params),
        bodyParams: this.extractBodyParams(method.params),
        auth: {
          required: false,
          middlewares: [],
        }, // AuthDetector実装後に対応
        sourceFile: controller.sourceFile,
        lineNumber: method.lineNumber,
      };
    });
  }

  /**
   * MethodDecoratorTypeをHttpMethodに変換
   */
  private convertHttpMethod(decoratorType: MethodDecoratorType): HttpMethod {
    const mapped = HTTP_METHOD_MAP[decoratorType];

    // OPTIONS, HEAD, ALLは標準のHttpMethodに含まれないため、GETにフォールバック
    if (mapped === 'OPTIONS' || mapped === 'HEAD' || mapped === 'ALL') {
      return 'GET';
    }

    return mapped;
  }

  /**
   * パスを結合
   */
  private joinPaths(basePath: string, methodPath: string): string {
    const base = basePath.startsWith('/') ? basePath : `/${basePath}`;
    if (!methodPath) {
      return base;
    }
    const method = methodPath.startsWith('/') ? methodPath : `/${methodPath}`;
    return `${base}${method}`.replace(/\/+/g, '/');
  }

  /**
   * パスパラメータを抽出
   */
  private extractPathParams(params: readonly ParamDecoratorInfo[]): readonly ParamInfo[] {
    return params
      .filter(p => p.type === 'Param')
      .map(p => ({
        name: p.argName ?? p.paramName,
        type: p.paramType,
        required: p.required,
      }));
  }

  /**
   * クエリパラメータを抽出
   */
  private extractQueryParams(params: readonly ParamDecoratorInfo[]): readonly ParamInfo[] {
    return params
      .filter(p => p.type === 'Query')
      .map(p => ({
        name: p.argName ?? p.paramName,
        type: p.paramType,
        required: p.required,
      }));
  }

  /**
   * ボディパラメータを抽出
   *
   * TODO: DTOの型情報を解析してParamInfo[]に変換
   * TypeExtractorを使用して実装予定
   */
  private extractBodyParams(params: readonly ParamDecoratorInfo[]): readonly ParamInfo[] {
    const bodyParam = params.find(p => p.type === 'Body');
    if (!bodyParam) {
      return [];
    }

    // TypeExtractor実装後に対応
    // 一旦空配列を返す
    return [];
  }
}
