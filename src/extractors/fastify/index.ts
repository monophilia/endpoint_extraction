// src/extractors/fastify/index.ts

import type { EndpointExtractor } from '../types';
import type {
  ExtractorOptions,
  ExtractedEndpoints,
  FrameworkType,
  AuthConfig,
} from '../../types';
import { DEFAULT_AUTH_CONFIG } from '../../types';
import { BuildFileParser } from './buildFileParser';
import { RouteFileParser } from './routeFileParser';
import * as path from 'path';

export class FastifyExtractor implements EndpointExtractor {
  readonly framework: FrameworkType = 'fastify';

  async extract(options: ExtractorOptions): Promise<ExtractedEndpoints> {
    const {
      projectRoot,
      entryFilePath = 'src/build.ts',
      tsconfigPath,
      authConfig = DEFAULT_AUTH_CONFIG,
      verbose = false,
    } = options;

    const fullEntryPath = path.join(projectRoot, entryFilePath);
    const fullTsconfigPath = tsconfigPath
      ? path.join(projectRoot, tsconfigPath)
      : path.join(projectRoot, 'tsconfig.json');

    if (verbose) {
      console.log(`[FastifyExtractor] Parsing: ${fullEntryPath}`);
    }

    // build.tsを解析してルート登録を取得
    const buildParser = new BuildFileParser(fullTsconfigPath);
    const registrations = buildParser.parse(fullEntryPath);

    if (verbose) {
      console.log(`[FastifyExtractor] Found ${registrations.length} route registrations`);
    }

    // 各ルートファイルを解析
    const routeParser = new RouteFileParser(fullTsconfigPath, authConfig);

    const routes = registrations.map(reg => {
      if (verbose) {
        console.log(`[FastifyExtractor] Parsing route: ${reg.resolvedFilePath}`);
      }

      const endpoints = routeParser.parse(reg.resolvedFilePath);

      return {
        prefix: reg.prefix,
        endpoints,
      };
    });

    // 統計を計算
    const allEndpoints = routes.flatMap(r => r.endpoints);
    const authRequiredCount = allEndpoints.filter(e => e.auth.required).length;
    const publicCount = allEndpoints.length - authRequiredCount;

    return {
      framework: 'fastify',
      projectRoot,
      routes,
      extractedAt: new Date().toISOString(),
      authRequiredCount,
      publicCount,
    };
  }

  async canHandle(projectRoot: string): Promise<boolean> {
    try {
      const packageJsonPath = `${projectRoot}/package.json`;
      const file = Bun.file(packageJsonPath);
      const content = await file.text();
      const packageJson = JSON.parse(content);

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      return 'fastify' in allDeps;
    } catch {
      return false;
    }
  }
}
