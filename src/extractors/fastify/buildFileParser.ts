// src/extractors/fastify/buildFileParser.ts

import {
  Project,
  type SourceFile,
  Node,
  SyntaxKind,
  type CallExpression,
} from 'ts-morph';
import * as path from 'node:path';

/**
 * ルート登録情報
 */
export type RouteRegistration = {
  /** インポート名 */
  readonly importName: string;
  /** インポートパス */
  readonly importPath: string;
  /** URLプレフィックス */
  readonly prefix: string;
  /** 解決済みファイルパス */
  readonly resolvedFilePath: string;
};

/**
 * build.tsファイルを解析してルート登録情報を抽出
 */
export class BuildFileParser {
  private project: Project;

  constructor(tsconfigPath?: string) {
    this.project = new Project({
      tsConfigFilePath: tsconfigPath,
      skipAddingFilesFromTsConfig: true,
    });
  }

  /**
   * build.tsファイルを解析してルート登録情報を抽出
   */
  parse(buildFilePath: string): readonly RouteRegistration[] {
    const sourceFile = this.project.addSourceFileAtPath(buildFilePath);
    return this.parseSourceFile(sourceFile, buildFilePath);
  }

  /**
   * ソース文字列から解析（テスト用）
   */
  parseFromSource(source: string, filePath: string): readonly RouteRegistration[] {
    const sourceFile = this.project.createSourceFile(filePath, source, {
      overwrite: true,
    });
    return this.parseSourceFile(sourceFile, filePath);
  }

  private parseSourceFile(
    sourceFile: SourceFile,
    buildFilePath: string
  ): readonly RouteRegistration[] {
    // import文からモジュール名とパスのマッピングを構築
    const importMap = this.buildImportMap(sourceFile);

    // app.register呼び出しを検出
    const registerCalls = this.findRegisterCalls(sourceFile);

    // ルート登録情報を構築
    return registerCalls
      .map(call => this.extractRegistration(call, importMap, buildFilePath))
      .filter((r): r is RouteRegistration => r !== null);
  }

  /**
   * import文からモジュール名 -> パスのマップを構築
   */
  private buildImportMap(sourceFile: SourceFile): Map<string, string> {
    const map = new Map<string, string>();

    for (const imp of sourceFile.getImportDeclarations()) {
      const moduleSpecifier = imp.getModuleSpecifierValue();

      // デフォルトインポート
      const defaultImport = imp.getDefaultImport();
      if (defaultImport) {
        map.set(defaultImport.getText(), moduleSpecifier);
      }

      // 名前付きインポート（エイリアス対応）
      for (const named of imp.getNamedImports()) {
        const name = named.getAliasNode()?.getText() ?? named.getName();
        map.set(name, moduleSpecifier);
      }
    }

    return map;
  }

  /**
   * app.register / server.register 呼び出しを検出
   */
  private findRegisterCalls(sourceFile: SourceFile): readonly CallExpression[] {
    return sourceFile
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter(call => {
        const expr = call.getExpression();
        if (!Node.isPropertyAccessExpression(expr)) {
          return false;
        }
        return expr.getName() === 'register';
      });
  }

  /**
   * register呼び出しからルート登録情報を抽出
   */
  private extractRegistration(
    call: CallExpression,
    importMap: Map<string, string>,
    buildFilePath: string
  ): RouteRegistration | null {
    const args = call.getArguments();
    if (args.length < 2) {
      return null;
    }

    // 第1引数: ルートモジュール
    const moduleArg = args[0];
    if (!moduleArg) {
      return null;
    }
    const importName = moduleArg.getText();
    const importPath = importMap.get(importName);

    if (!importPath) {
      return null;
    }

    // 第2引数: オプション { prefix: '...' }
    const optionsArg = args[1];
    if (!optionsArg) {
      return null;
    }
    const prefix = this.extractPrefix(optionsArg);

    if (!prefix) {
      return null;
    }

    // ファイルパスを解決
    const buildDir = path.dirname(buildFilePath);
    const resolvedFilePath = this.resolveFilePath(buildDir, importPath);

    return {
      importName,
      importPath,
      prefix,
      resolvedFilePath,
    };
  }

  /**
   * オプションオブジェクトからprefixを抽出
   */
  private extractPrefix(optionsNode: Node): string | null {
    if (!Node.isObjectLiteralExpression(optionsNode)) {
      return null;
    }

    const prefixProp = optionsNode.getProperty('prefix');
    if (!prefixProp || !Node.isPropertyAssignment(prefixProp)) {
      return null;
    }

    const initializer = prefixProp.getInitializer();
    if (!initializer || !Node.isStringLiteral(initializer)) {
      return null;
    }

    return initializer.getLiteralValue();
  }

  /**
   * 相対パスを解決
   */
  private resolveFilePath(baseDir: string, importPath: string): string {
    const resolved = path.resolve(baseDir, importPath);
    // .ts拡張子を追加（なければ）
    return resolved.endsWith('.ts') ? resolved : `${resolved}.ts`;
  }
}
