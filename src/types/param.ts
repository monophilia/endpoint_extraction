// src/types/param.ts

/**
 * パラメータ情報
 */
export type ParamInfo = {
  /** パラメータ名 */
  readonly name: string;
  /** TypeScript型（文字列表現） */
  readonly type: string;
  /** 必須かどうか */
  readonly required: boolean;
};
