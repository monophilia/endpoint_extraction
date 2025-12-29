// src/core/frameworkDetector.ts

import type { FrameworkType, FrameworkDetectionResult } from '../types';

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} | null;

/**
 * フレームワーク検出の優先度と依存関係パターン
 */
const FRAMEWORK_PATTERNS: ReadonlyArray<{
  framework: FrameworkType;
  dependencies: readonly string[];
  priority: number;
}> = [
  {
    framework: 'nestjs',
    dependencies: ['@nestjs/core', '@nestjs/common'],
    priority: 1, // 最優先（他のフレームワークと併用されることがある）
  },
  {
    framework: 'fastify',
    dependencies: ['fastify'],
    priority: 2,
  },
  {
    framework: 'express',
    dependencies: ['express'],
    priority: 3,
  },
];

export class FrameworkDetector {
  /**
   * package.jsonからフレームワークを検出
   */
  async detect(projectRoot: string): Promise<FrameworkDetectionResult | null> {
    const packageJsonPath = `${projectRoot}/package.json`;

    const packageJson = await this.readPackageJson(packageJsonPath);
    if (!packageJson) {
      return null;
    }

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // 優先度順にチェック
    const sortedPatterns = [...FRAMEWORK_PATTERNS].sort(
      (a, b) => a.priority - b.priority
    );

    for (const pattern of sortedPatterns) {
      const matchedDeps = pattern.dependencies.filter(dep => dep in allDeps);

      if (matchedDeps.length > 0) {
        const confidence = matchedDeps.length / pattern.dependencies.length;

        return {
          framework: pattern.framework,
          confidence,
          reason: `Found dependencies: ${matchedDeps.join(', ')}`,
        };
      }
    }

    return null;
  }

  /**
   * 特定のフレームワークかどうか判定
   */
  async isFramework(
    projectRoot: string,
    framework: FrameworkType
  ): Promise<boolean> {
    const result = await this.detect(projectRoot);
    return result?.framework === framework;
  }

  private async readPackageJson(
    path: string
  ): Promise<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | null> {
    try {
      const file = Bun.file(path);
      const content = await file.text();
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
