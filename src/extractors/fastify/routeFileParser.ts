// src/extractors/fastify/routeFileParser.ts

import {
  Project,
  SourceFile,
  Node,
  SyntaxKind,
  CallExpression,
} from 'ts-morph';
import type { EndpointInfo, HttpMethod, ParamInfo, AuthConfig } from '../../types';
import { HTTP_METHODS, DEFAULT_AUTH_CONFIG } from '../../types';
import { TypeExtractor } from '../../core/typeExtractor';
import { AuthDetector } from './authDetector';

export class RouteFileParser {
  private readonly project: Project;
  private readonly authDetector: AuthDetector;

  constructor(tsconfigPath?: string, authConfig: AuthConfig = DEFAULT_AUTH_CONFIG) {
    this.project = new Project({
      tsConfigFilePath: tsconfigPath,
      skipAddingFilesFromTsConfig: true,
    });
    this.authDetector = new AuthDetector(authConfig);
  }

  parse(filePath: string): readonly EndpointInfo[] {
    const sourceFile = this.project.addSourceFileAtPath(filePath);
    return this.parseSourceFile(sourceFile, filePath);
  }

  parseFromSource(source: string, filePath: string): readonly EndpointInfo[] {
    const sourceFile = this.project.createSourceFile(filePath, source, {
      overwrite: true,
    });
    return this.parseSourceFile(sourceFile, filePath);
  }

  private parseSourceFile(sourceFile: SourceFile, filePath: string): readonly EndpointInfo[] {
    const typeExtractor = new TypeExtractor(sourceFile);
    const methodCalls = this.findHttpMethodCalls(sourceFile);

    return methodCalls
      .map(call => this.extractEndpoint(call, typeExtractor, filePath))
      .filter((e): e is EndpointInfo => e !== null);
  }

  private findHttpMethodCalls(sourceFile: SourceFile): readonly CallExpression[] {
    const methodNames = HTTP_METHODS.map(m => m.toLowerCase());

    return sourceFile
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter(call => {
        const expr = call.getExpression();
        if (!Node.isPropertyAccessExpression(expr)) {
          return false;
        }
        const methodName = expr.getName().toLowerCase();
        return methodNames.includes(methodName);
      });
  }

  private extractEndpoint(
    call: CallExpression,
    typeExtractor: TypeExtractor,
    filePath: string
  ): EndpointInfo | null {
    const expr = call.getExpression();
    if (!Node.isPropertyAccessExpression(expr)) {
      return null;
    }

    const methodName = expr.getName().toUpperCase();
    const method = this.toHttpMethod(methodName);

    if (!method) {
      return null;
    }

    const args = call.getArguments();
    if (args.length === 0) {
      return null;
    }

    const pathArg = args[0];
    if (!Node.isStringLiteral(pathArg)) {
      return null;
    }
    const routePath = pathArg.getLiteralValue();

    const typeArgs = call.getTypeArguments();
    const { pathParams, queryParams, bodyParams } =
      typeArgs.length > 0 && typeArgs[0]
        ? this.extractParamsFromTypeArg(typeArgs[0], typeExtractor, routePath)
        : {
            pathParams: this.extractPathParamsFromPath(routePath),
            queryParams: [],
            bodyParams: [],
          };

    const auth = this.authDetector.detect(args);

    return {
      path: routePath,
      method,
      pathParams,
      queryParams,
      bodyParams,
      auth,
      sourceFile: filePath,
      lineNumber: call.getStartLineNumber(),
    };
  }

  private toHttpMethod(method: string): HttpMethod | null {
    switch (method) {
      case 'GET':
        return 'GET';
      case 'POST':
        return 'POST';
      case 'PUT':
        return 'PUT';
      case 'DELETE':
        return 'DELETE';
      case 'PATCH':
        return 'PATCH';
      default:
        return null;
    }
  }

  private extractParamsFromTypeArg(
    typeArg: Node,
    typeExtractor: TypeExtractor,
    routePath: string
  ): {
    pathParams: readonly ParamInfo[];
    queryParams: readonly ParamInfo[];
    bodyParams: readonly ParamInfo[];
  } {
    const type = typeArg.getType();
    const properties = type.getProperties();

    const paramsMap: Map<string, readonly ParamInfo[]> = new Map();

    for (const prop of properties) {
      const propName = prop.getName();
      const propType = prop.getValueDeclaration()?.getType();

      if (!propType) {
        continue;
      }

      const params = typeExtractor.extractProperties(propType);
      paramsMap.set(propName, params);
    }

    const pathParams = paramsMap.get('Params') ?? this.extractPathParamsFromPath(routePath);
    const queryParams = paramsMap.get('Querystring') ?? [];
    const bodyParams = paramsMap.get('Body') ?? [];

    return {
      pathParams,
      queryParams,
      bodyParams,
    };
  }

  private extractPathParamsFromPath(routePath: string): readonly ParamInfo[] {
    const paramPattern = /:(\w+)/g;
    const params: ParamInfo[] = [];

    const matches = routePath.matchAll(paramPattern);
    for (const match of matches) {
      const paramName = match[1];
      if (!paramName) {
        continue;
      }
      params.push({
        name: paramName,
        type: 'string',
        required: true,
      });
    }

    return params;
  }
}
