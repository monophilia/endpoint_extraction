// src/extractors/fastify/buildFileParser.ts
// TODO: 実装待ち

/**
 * ルート登録情報
 */
export type RouteRegistration = {
  /** URLプレフィックス */
  readonly prefix: string;
  /** 解決済みファイルパス */
  readonly resolvedFilePath: string;
};

/**
 * build.tsの解析（未実装）
 */
export class BuildFileParser {
  constructor(private readonly tsconfigPath: string) {}

  /**
   * build.tsを解析してルート登録を取得
   * @param filePath build.tsのパス
   * @returns ルート登録情報の配列
   */
  parse(filePath: string): readonly RouteRegistration[] {
    throw new Error('BuildFileParser.parse() is not implemented yet');
  }
}
