// src/core/typeExtractor.ts

import { Type, SourceFile, Symbol as TsSymbol } from 'ts-morph';
import type { ParamInfo } from '../types';

export class TypeExtractor {
  constructor(private readonly sourceFile: SourceFile) {}

  extractProperties(type: Type): readonly ParamInfo[] {
    // プリミティブ型は空を返す
    if (type.isString() || type.isNumber() || type.isBoolean() || type.isNull() || type.isUndefined()) {
      return [];
    }

    // 配列型の場合は要素型を表示用に返す
    if (type.isArray()) {
      return this.extractArrayProperties(type);
    }

    // 組み込みオブジェクト型（Promise, Date等）は除外
    const typeName = type.getSymbol()?.getName();
    if (typeName && this.isBuiltInType(typeName)) {
      return [];
    }

    // Fastify型は除外
    if (typeName && this.isFastifyType(typeName)) {
      return [];
    }

    // 型がnode_modules/fastifyから来ている場合は除外
    if (this.isFromFastifyModule(type)) {
      return [];
    }

    const properties = type.getProperties();
    // 配列メソッドとFastify内部プロパティを除外
    const filteredProps = properties.filter(prop => {
      const propName = prop.getName();
      return !this.isArrayMethod(propName) && !this.isFastifyInternalProperty(propName);
    });
    return filteredProps.map(prop => this.extractPropertyInfo(prop, type));
  }

  private extractArrayProperties(type: Type): readonly ParamInfo[] {
    const elementType = type.getArrayElementType();
    if (!elementType) {
      return [];
    }
    // 配列の場合、単一プロパティとして型を表現
    return [{
      name: 'items',
      type: this.formatType(elementType) + '[]',
      required: true,
    }];
  }

  private isBuiltInType(name: string): boolean {
    const builtInTypes = ['Promise', 'Date', 'RegExp', 'Error', 'Map', 'Set', 'WeakMap', 'WeakSet'];
    return builtInTypes.includes(name);
  }

  private isFastifyType(name: string): boolean {
    // Fastify関連の型名パターン
    const fastifyPatterns = [
      'Fastify', 'Raw', 'RouteGeneric', 'ContextConfig',
      'FastifyReply', 'FastifyRequest', 'FastifyInstance', 'FastifyServer',
      'FastifyContext', 'FastifyLoggerInstance', 'FastifySchema',
      'RouteGenericInterface', 'RawServerDefault', 'RawRequestDefaultExpression',
      'RawReplyDefaultExpression', 'ContextConfigDefault',
    ];

    for (const pattern of fastifyPatterns) {
      if (name.includes(pattern)) {
        return true;
      }
    }
    return false;
  }

  private isFromFastifyModule(type: Type): boolean {
    const symbol = type.getSymbol();
    if (!symbol) {
      return false;
    }

    const declarations = symbol.getDeclarations();
    for (const decl of declarations) {
      const sourceFilePath = decl.getSourceFile().getFilePath();
      if (sourceFilePath.includes('node_modules/fastify') ||
          sourceFilePath.includes('node_modules/@fastify') ||
          sourceFilePath.includes('node_modules/.pnpm/fastify') ||
          sourceFilePath.includes('node_modules/.pnpm/@fastify')) {
        return true;
      }
    }
    return false;
  }

  private isFastifyInternalProperty(name: string): boolean {
    // 注意: id, body, url, method, hostname, protocol, error, typeなどは
    // ユーザーのデータ型でも使用される一般的なプロパティ名なので除外しない
    const internalProps = [
      // FastifyReply 内部プロパティ（明らかにフレームワーク固有）
      'context', 'log', 'request', 'server', 'raw', 'res', 'req',
      'sent', 'hijacked', 'statusCode', 'getHeaders',
      'hasHeader', 'removeHeader', 'getHeader',
      'redirect', 'callNotFound', 'serialize', 'compileSerializationSchema',
      'getSerializationFunction', 'serializeInput', 'elapsedTime',
      'trailer', 'hasTrailer', 'removeTrailer', 'then',
      // FastifyRequest 内部プロパティ（明らかにフレームワーク固有）
      'routerPath', 'routerMethod', 'is404', 'socket', 'ips',
      'routeOptions', 'routeConfig', 'routeSchema', 'connection',
      'getValidationFunction', 'compileValidationSchema', 'validateInput',
      // FastifyInstance 内部プロパティ
      'prefix', 'listeningOrigin', 'addresses', 'pluginName',
      'setNotFoundHandler', 'setErrorHandler', 'addHook', 'decorateRequest',
      'decorateReply', 'decorate', 'hasDecorator', 'hasRequestDecorator',
      'hasReplyDecorator', 'inject', 'listen', 'route', 'close', 'ready',
      'register', 'after', 'setValidatorCompiler', 'setSerializerCompiler',
      // logger
      'child', 'fatal', 'warn', 'info', 'debug', 'trace', 'silent',
    ];
    return internalProps.includes(name);
  }

  private isArrayMethod(name: string): boolean {
    const arrayMethods = [
      'length', 'toString', 'toLocaleString', 'pop', 'push', 'concat', 'join',
      'reverse', 'shift', 'slice', 'sort', 'splice', 'unshift', 'indexOf',
      'lastIndexOf', 'every', 'some', 'forEach', 'map', 'filter', 'reduce',
      'reduceRight', 'find', 'findIndex', 'fill', 'copyWithin', 'entries',
      'keys', 'values', 'includes', 'flatMap', 'flat', 'at', 'findLast',
      'findLastIndex', 'toReversed', 'toSorted', 'toSpliced', 'with',
    ];
    // Symbol系のメソッドも除外
    if (name.startsWith('__@')) {
      return true;
    }
    return arrayMethods.includes(name);
  }

  private extractPropertyInfo(symbol: TsSymbol, parentType: Type): ParamInfo {
    const name = symbol.getName();
    const declaration = symbol.getValueDeclaration();

    const propType = declaration?.getType() ?? parentType.getProperty(name)?.getTypeAtLocation(this.sourceFile);
    const typeText = propType ? this.formatType(propType) : 'unknown';

    const isOptional = symbol.isOptional();

    return {
      name,
      type: typeText,
      required: !isOptional,
    };
  }

  private formatType(type: Type): string {
    if (type.isString()) return 'string';
    if (type.isNumber()) return 'number';
    if (type.isBoolean()) return 'boolean';
    if (type.isNull()) return 'null';
    if (type.isUndefined()) return 'undefined';

    if (type.isStringLiteral()) {
      return `'${type.getLiteralValue()}'`;
    }
    if (type.isNumberLiteral()) {
      return String(type.getLiteralValue());
    }
    if (type.isBooleanLiteral()) {
      return String(type.getLiteralValue());
    }

    // Fastify型は簡略表記
    const typeName = type.getSymbol()?.getName();
    if (typeName && this.isFastifyType(typeName)) {
      return typeName;
    }

    // node_modules/fastifyからの型は簡略表記
    if (this.isFromFastifyModule(type)) {
      return typeName ?? 'unknown';
    }

    if (type.isUnion()) {
      const types = type.getUnionTypes();
      return types.map(t => this.formatType(t)).join(' | ');
    }

    if (type.isArray()) {
      return this.formatArrayType(type);
    }

    if (type.isObject() && !type.isArray()) {
      return this.formatObjectType(type);
    }

    return type.getText(this.sourceFile);
  }

  private formatArrayType(type: Type): string {
    const elementType = type.getArrayElementType();
    if (!elementType) {
      return type.getText(this.sourceFile);
    }
    return `${this.formatType(elementType)}[]`;
  }

  private formatObjectType(type: Type): string {
    // Fastify型は名前だけ返す
    const typeName = type.getSymbol()?.getName();
    if (typeName && this.isFastifyType(typeName)) {
      return typeName;
    }

    if (this.isFromFastifyModule(type)) {
      return typeName ?? 'object';
    }

    const props = type.getProperties();
    // Fastify内部プロパティを除外
    const filteredProps = props.filter(p => {
      const propName = p.getName();
      return !this.isArrayMethod(propName) && !this.isFastifyInternalProperty(propName);
    });

    if (filteredProps.length === 0) {
      return type.getText(this.sourceFile);
    }

    const propsText = filteredProps
      .map(p => {
        const propType = p.getValueDeclaration()?.getType();
        const typeStr = propType ? this.formatType(propType) : 'unknown';
        return `${p.getName()}: ${typeStr}`;
      })
      .join('; ');
    return `{ ${propsText}; }`;
  }
}
