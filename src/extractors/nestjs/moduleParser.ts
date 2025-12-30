import { SourceFile, Node, ObjectLiteralExpression } from 'ts-morph';
import type { ModuleInfo, ControllerRegistration } from '../../types/nestjs';
import * as path from 'path';

export class ModuleParser {
  /**
   * モジュールファイルを解析
   */
  parseModule(sourceFile: SourceFile): ModuleInfo {
    const classes = sourceFile.getClasses();

    for (const classDecl of classes) {
      const moduleDecorator = classDecl.getDecorator('Module');
      if (!moduleDecorator) {
        continue;
      }

      const args = moduleDecorator.getArguments();
      if (args.length === 0) {
        continue;
      }

      const configArg = args[0];
      if (!Node.isObjectLiteralExpression(configArg)) {
        continue;
      }

      return {
        name: classDecl.getName() ?? 'AppModule',
        controllers: this.extractControllers(configArg, sourceFile),
        globalGuards: this.extractGlobalGuards(configArg),
        sourceFile: sourceFile.getFilePath(),
      };
    }

    return {
      name: 'Unknown',
      controllers: [],
      globalGuards: [],
      sourceFile: sourceFile.getFilePath(),
    };
  }

  /**
   * controllersプロパティからコントローラー一覧を抽出
   */
  private extractControllers(
    config: ObjectLiteralExpression,
    sourceFile: SourceFile
  ): readonly ControllerRegistration[] {
    const controllersProp = config.getProperty('controllers');
    if (!controllersProp) {
      return [];
    }

    if (!Node.isPropertyAssignment(controllersProp)) {
      return [];
    }

    const initializer = controllersProp.getInitializer();
    if (!initializer) {
      return [];
    }

    if (!Node.isArrayLiteralExpression(initializer)) {
      return [];
    }

    const results: ControllerRegistration[] = [];
    const elements = initializer.getElements();

    for (const element of elements) {
      if (!Node.isIdentifier(element)) {
        continue;
      }

      const name = element.getText();
      const importPath = this.resolveImportPath(sourceFile, name);

      results.push({
        name,
        importPath,
        resolvedPath: this.resolveFilePath(sourceFile.getFilePath(), importPath),
      });
    }

    return results;
  }

  /**
   * APP_GUARDからグローバルガードを抽出
   */
  private extractGlobalGuards(config: ObjectLiteralExpression): readonly string[] {
    const providersProp = config.getProperty('providers');
    if (!providersProp) {
      return [];
    }

    if (!Node.isPropertyAssignment(providersProp)) {
      return [];
    }

    const initializer = providersProp.getInitializer();
    if (!initializer) {
      return [];
    }

    if (!Node.isArrayLiteralExpression(initializer)) {
      return [];
    }

    const guards: string[] = [];
    const elements = initializer.getElements();

    for (const element of elements) {
      if (!Node.isObjectLiteralExpression(element)) {
        continue;
      }

      const provideProp = element.getProperty('provide');
      const useClassProp = element.getProperty('useClass');

      if (!provideProp || !useClassProp) {
        continue;
      }

      // provide: APP_GUARD のチェック
      if (!Node.isPropertyAssignment(provideProp)) {
        continue;
      }

      const provideInit = provideProp.getInitializer();
      if (!provideInit || provideInit.getText() !== 'APP_GUARD') {
        continue;
      }

      // useClass の値を取得
      if (!Node.isPropertyAssignment(useClassProp)) {
        continue;
      }

      const useClassInit = useClassProp.getInitializer();
      if (useClassInit && Node.isIdentifier(useClassInit)) {
        guards.push(useClassInit.getText());
      }
    }

    return guards;
  }

  // --- Private Methods ---

  private resolveImportPath(sourceFile: SourceFile, identifier: string): string {
    const imports = sourceFile.getImportDeclarations();

    for (const importDecl of imports) {
      const namedImports = importDecl.getNamedImports();
      for (const namedImport of namedImports) {
        if (namedImport.getName() === identifier) {
          return importDecl.getModuleSpecifierValue();
        }
      }
    }

    return '';
  }

  private resolveFilePath(moduleFilePath: string, importPath: string): string {
    if (!importPath.startsWith('.')) {
      return importPath; // node_modulesからのインポート
    }

    const dir = path.dirname(moduleFilePath);
    const resolved = path.resolve(dir, importPath);

    // .ts拡張子を追加
    if (!resolved.endsWith('.ts')) {
      return `${resolved}.ts`;
    }

    return resolved;
  }
}
