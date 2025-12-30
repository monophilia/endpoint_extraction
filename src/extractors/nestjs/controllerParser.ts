// src/extractors/nestjs/controllerParser.ts

import { SourceFile, ClassDeclaration } from 'ts-morph';
import type {
  ControllerInfo,
  ControllerMethodInfo,
  ParamDecoratorInfo,
  MethodDecoratorType,
  EndpointAuth,
} from '../../types/nestjs';
import type { EndpointInfo } from '../../types/endpoint';
import type { ParamInfo } from '../../types/param';
import type { HttpMethod } from '../../types/http';
import type { AuthInfo } from '../../types/auth';
import { DecoratorParser } from './decoratorParser';
import type { NestJSAuthDetector } from './authDetector';

/**
 * 認証検出器のインターフェース
 */
type AuthDetector = Pick<NestJSAuthDetector, 'detectAuth'>;

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
  private readonly decoratorParser: DecoratorParser;
  private readonly publicDecorators: readonly string[];

  constructor(publicDecorators: readonly string[] = ['Public', 'SkipAuth']) {
    this.decoratorParser = new DecoratorParser();
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
    const basePath = this.decoratorParser.parseControllerDecorator(classDecl);
    const classGuards = this.decoratorParser.parseGuardDecorators(classDecl, 'class');
    const classMetadata = this.decoratorParser.parseMetadataDecorators(
      classDecl,
      this.publicDecorators
    );

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
   * コントローラーのメソッドを解析
   */
  private parseMethods(classDecl: ClassDeclaration): readonly ControllerMethodInfo[] {
    const methods = classDecl.getMethods();

    return methods
      .map(method => {
        const httpMethod = this.decoratorParser.parseMethodDecorator(method);
        if (!httpMethod) {
          return null;
        }

        return {
          name: method.getName(),
          httpMethod,
          params: this.decoratorParser.parseParamDecorators(method),
          guards: this.decoratorParser.parseGuardDecorators(method, 'method'),
          metadata: this.decoratorParser.parseMetadataDecorators(method, this.publicDecorators),
          lineNumber: method.getStartLineNumber(),
        };
      })
      .filter((method): method is ControllerMethodInfo => method !== null);
  }

  /**
   * EndpointInfo形式に変換
   */
  extractEndpoints(
    controller: ControllerInfo,
    globalGuards: readonly string[],
    authDetector: AuthDetector
  ): readonly EndpointInfo[] {
    return controller.methods.map(method => {
      const fullPath = this.joinPaths(controller.basePath, method.httpMethod.path);
      const httpMethod = this.convertHttpMethod(method.httpMethod.type);
      const endpointAuth = authDetector.detectAuth(controller, method, globalGuards);

      return {
        path: fullPath,
        method: httpMethod,
        pathParams: this.extractPathParams(method.params),
        queryParams: this.extractQueryParams(method.params),
        bodyParams: this.extractBodyParams(method.params),
        auth: this.convertToAuthInfo(endpointAuth),
        sourceFile: controller.sourceFile,
        lineNumber: method.lineNumber,
      };
    });
  }

  /**
   * EndpointAuthをAuthInfoに変換
   */
  private convertToAuthInfo(endpointAuth: EndpointAuth): AuthInfo {
    return {
      required: endpointAuth.required === true,
      middlewares: endpointAuth.guards.map(g => g.name),
    };
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
