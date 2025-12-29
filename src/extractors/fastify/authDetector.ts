// src/extractors/fastify/authDetector.ts

import type { Node } from 'ts-morph';
import { Node as TsNode } from 'ts-morph';
import type { AuthConfig, AuthInfo } from '../../types';

export class AuthDetector {
  constructor(private readonly config: AuthConfig) {}

  detect(args: Node[]): AuthInfo {
    const optionsArg = args.find(arg => TsNode.isObjectLiteralExpression(arg));

    if (!optionsArg || !TsNode.isObjectLiteralExpression(optionsArg)) {
      return { required: false, middlewares: [] };
    }

    for (const hookPoint of this.config.hookPoints) {
      const hookProp = optionsArg.getProperty(hookPoint);
      if (!hookProp) {
        continue;
      }

      const detectedMiddlewares = this.extractMiddlewareNames(hookProp);
      const authMiddlewares = this.filterAuthMiddlewares(detectedMiddlewares);

      if (authMiddlewares.length > 0) {
        return {
          required: true,
          middlewares: authMiddlewares,
          hookPoint,
        };
      }
    }

    return { required: false, middlewares: [] };
  }

  private extractMiddlewareNames(hookProp: Node): readonly string[] {
    const middlewares: string[] = [];

    hookProp.forEachDescendant(node => {
      if (!TsNode.isIdentifier(node)) {
        return;
      }

      const name = node.getText();
      if (this.isHookPointName(name) || this.isReservedKeyword(name)) {
        return;
      }

      middlewares.push(name);
    });

    return middlewares;
  }

  private filterAuthMiddlewares(middlewares: readonly string[]): readonly string[] {
    return middlewares.filter(name => this.isAuthMiddleware(name));
  }

  isAuthMiddleware(name: string): boolean {
    const lowerName = name.toLowerCase();
    return this.config.middlewareNames.some(
      (authName: string) => lowerName.includes(authName.toLowerCase())
    );
  }

  private isHookPointName(name: string): boolean {
    const hookNames = ['preHandler', 'onRequest', 'preValidation', 'preParsing', 'preSerialization', 'onSend', 'onResponse', 'onError', 'onTimeout'];
    return hookNames.includes(name);
  }

  private isReservedKeyword(name: string): boolean {
    const reserved = ['async', 'await', 'function', 'const', 'let', 'var'];
    return reserved.includes(name);
  }
}
