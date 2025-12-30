import { MethodDeclaration, ClassDeclaration, Node } from 'ts-morph';
import type {
  MethodDecoratorInfo,
  ParamDecoratorInfo,
  GuardDecoratorInfo,
  MetadataDecoratorInfo,
  MethodDecoratorType,
  ParamDecoratorType,
} from '../../types/nestjs';

const HTTP_METHOD_DECORATORS = [
  'Get', 'Post', 'Put', 'Delete', 'Patch', 'Options', 'Head', 'All'
] as const;

const PARAM_DECORATORS = [
  'Param', 'Body', 'Query', 'Headers', 'Req', 'Res'
] as const;

export class DecoratorParser {
  /**
   * メソッドからHTTPメソッドデコレーターを抽出
   */
  parseMethodDecorator(method: MethodDeclaration): MethodDecoratorInfo | null {
    const decorators = method.getDecorators();

    for (const decorator of decorators) {
      const name = decorator.getName();

      if (!this.isHttpMethodDecorator(name)) {
        continue;
      }

      const args = decorator.getArguments();
      const path = args.length > 0 ? this.extractStringValue(args[0]) : '';

      return {
        type: name,
        path,
        lineNumber: decorator.getStartLineNumber(),
      };
    }

    return null;
  }

  /**
   * メソッドからパラメーターデコレーターを抽出
   */
  parseParamDecorators(method: MethodDeclaration): readonly ParamDecoratorInfo[] {
    const params = method.getParameters();
    const results: ParamDecoratorInfo[] = [];

    for (const param of params) {
      const decorators = param.getDecorators();

      for (const decorator of decorators) {
        const name = decorator.getName();

        if (!this.isParamDecorator(name)) {
          continue;
        }

        const args = decorator.getArguments();
        const argName = args.length > 0 ? this.extractStringValue(args[0]) : undefined;

        results.push({
          type: name,
          argName,
          paramName: param.getName(),
          paramType: param.getType().getText(),
          required: !param.isOptional() && !param.hasQuestionToken(),
        });
      }
    }

    return results;
  }

  /**
   * メソッドまたはクラスから@UseGuardsを抽出
   */
  parseGuardDecorators(
    node: MethodDeclaration | ClassDeclaration,
    level: 'method' | 'class' = 'method'
  ): readonly GuardDecoratorInfo[] {
    const decorators = node.getDecorators();
    const results: GuardDecoratorInfo[] = [];

    for (const decorator of decorators) {
      if (decorator.getName() !== 'UseGuards') {
        continue;
      }

      const args = decorator.getArguments();
      const guards = args.map(arg => this.extractIdentifierName(arg));

      results.push({
        guards: guards.filter((g): g is string => g !== null),
        level,
        lineNumber: decorator.getStartLineNumber(),
      });
    }

    return results;
  }

  /**
   * カスタムメタデータデコレーターを抽出
   */
  parseMetadataDecorators(
    node: MethodDeclaration | ClassDeclaration,
    decoratorNames: readonly string[]
  ): readonly MetadataDecoratorInfo[] {
    const decorators = node.getDecorators();
    const results: MetadataDecoratorInfo[] = [];

    for (const decorator of decorators) {
      const name = decorator.getName();

      if (!decoratorNames.includes(name)) {
        continue;
      }

      const args = decorator.getArguments();
      const value = this.extractDecoratorValue(args);

      results.push({
        name,
        key: this.inferMetadataKey(name),
        value,
        lineNumber: decorator.getStartLineNumber(),
      });
    }

    return results;
  }

  /**
   * @Controller('path')からパスを抽出
   */
  parseControllerDecorator(classDecl: ClassDeclaration): string {
    const decorator = classDecl.getDecorator('Controller');
    if (!decorator) {
      return '';
    }

    const args = decorator.getArguments();
    if (args.length === 0) {
      return '';
    }

    return this.extractStringValue(args[0]);
  }

  // --- Private Methods ---

  private isHttpMethodDecorator(name: string): name is MethodDecoratorType {
    const httpMethods: readonly string[] = HTTP_METHOD_DECORATORS;
    return httpMethods.includes(name);
  }

  private isParamDecorator(name: string): name is ParamDecoratorType {
    const paramDecorators: readonly string[] = PARAM_DECORATORS;
    return paramDecorators.includes(name);
  }

  private extractStringValue(node: Node): string {
    if (Node.isStringLiteral(node)) {
      return node.getLiteralValue();
    }
    return node.getText().replace(/['"]/g, '');
  }

  private extractIdentifierName(node: Node): string | null {
    if (Node.isIdentifier(node)) {
      return node.getText();
    }

    if (!Node.isCallExpression(node)) {
      return null;
    }

    const expr = node.getExpression();
    if (!Node.isIdentifier(expr)) {
      return null;
    }

    return expr.getText();
  }

  private extractDecoratorValue(args: Node[]): unknown {
    if (args.length === 0) {
      return true; // @Public() のような引数なしデコレーター
    }

    if (args.length === 1) {
      return this.nodeToValue(args[0]);
    }

    return args.map(arg => this.nodeToValue(arg));
  }

  private nodeToValue(node: Node): unknown {
    if (Node.isStringLiteral(node)) {
      return node.getLiteralValue();
    }
    if (Node.isNumericLiteral(node)) {
      return node.getLiteralValue();
    }
    if (Node.isTrueLiteral(node)) {
      return true;
    }
    if (Node.isFalseLiteral(node)) {
      return false;
    }
    if (Node.isArrayLiteralExpression(node)) {
      return node.getElements().map(el => this.nodeToValue(el));
    }
    return node.getText();
  }

  private inferMetadataKey(decoratorName: string): string {
    const keyMap: Record<string, string> = {
      Public: 'isPublic',
      SkipAuth: 'skipAuth',
      Roles: 'roles',
      Permissions: 'permissions',
    };
    return keyMap[decoratorName] ?? decoratorName.toLowerCase();
  }
}
