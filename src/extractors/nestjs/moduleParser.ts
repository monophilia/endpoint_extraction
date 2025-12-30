import { SourceFile, Node, ObjectLiteralExpression } from 'ts-morph';
import type { ModuleInfo, ControllerRegistration, ModuleRegistration } from '../../types/nestjs';
import * as path from 'path';

export class ModuleParser {
  private readonly projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

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
        importedModules: this.extractImportedModules(configArg, sourceFile),
        globalGuards: this.extractGlobalGuards(configArg),
        sourceFile: sourceFile.getFilePath(),
      };
    }

    return {
      name: 'Unknown',
      controllers: [],
      importedModules: [],
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
   * importsプロパティからモジュール一覧を抽出
   */
  private extractImportedModules(
    config: ObjectLiteralExpression,
    sourceFile: SourceFile
  ): readonly ModuleRegistration[] {
    const importsProp = config.getProperty('imports');
    if (!importsProp) {
      return [];
    }

    if (!Node.isPropertyAssignment(importsProp)) {
      return [];
    }

    const initializer = importsProp.getInitializer();
    if (!initializer) {
      return [];
    }

    if (!Node.isArrayLiteralExpression(initializer)) {
      return [];
    }

    const results: ModuleRegistration[] = [];
    const elements = initializer.getElements();

    for (const element of elements) {
      const moduleName = this.extractModuleName(element);
      if (!moduleName) {
        continue;
      }

      // Module名がModuleで終わるもののみを対象（TypeOrmModule.forRoot等は除外）
      if (!moduleName.endsWith('Module')) {
        continue;
      }

      const importPath = this.resolveImportPath(sourceFile, moduleName);
      // node_modulesからのインポートは除外
      if (!importPath.startsWith('.') && !importPath.startsWith('src/')) {
        continue;
      }

      results.push({
        name: moduleName,
        importPath,
        resolvedPath: this.resolveFilePath(sourceFile.getFilePath(), importPath),
      });
    }

    return results;
  }

  /**
   * 要素からモジュール名を抽出
   * - 直接参照: UserModule
   * - forwardRef: forwardRef(() => UserModule)
   */
  private extractModuleName(element: Node): string | null {
    // 直接識別子の場合
    if (Node.isIdentifier(element)) {
      return element.getText();
    }

    // forwardRef(() => ModuleName) の場合
    if (!Node.isCallExpression(element)) {
      return null;
    }

    const expression = element.getExpression();
    if (!Node.isIdentifier(expression)) {
      return null;
    }

    if (expression.getText() !== 'forwardRef') {
      return null;
    }

    const args = element.getArguments();
    if (args.length === 0) {
      return null;
    }

    const arg = args[0];
    if (!Node.isArrowFunction(arg)) {
      return null;
    }

    const body = arg.getBody();
    if (!Node.isIdentifier(body)) {
      return null;
    }

    return body.getText();
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
    // src/ から始まるパスはプロジェクトルートからの相対パス
    if (importPath.startsWith('src/')) {
      const resolved = path.resolve(this.projectRoot, importPath);
      return resolved.endsWith('.ts') ? resolved : `${resolved}.ts`;
    }

    // 相対パス
    if (importPath.startsWith('.')) {
      const dir = path.dirname(moduleFilePath);
      const resolved = path.resolve(dir, importPath);
      return resolved.endsWith('.ts') ? resolved : `${resolved}.ts`;
    }

    // node_modulesからのインポート
    return importPath;
  }
}
