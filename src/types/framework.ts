// src/types/framework.ts

/**
 * 対応フレームワーク
 */
export const FRAMEWORKS = ['fastify', 'nestjs', 'express'] as const;

export type FrameworkType = typeof FRAMEWORKS[number];

/**
 * フレームワーク検出結果
 */
export type FrameworkDetectionResult = {
  /** 検出されたフレームワーク */
  readonly framework: FrameworkType;
  /** 検出の確度（0-1） */
  readonly confidence: number;
  /** 検出根拠 */
  readonly reason: string;
};
