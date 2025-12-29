// index.ts

import { FastifyExtractor } from './src/extractors/fastify';
import { YamlGenerator } from './src/generators/yamlGenerator';
import type { CLIOptions, AuthConfig, FrameworkType } from './src/types';
import { DEFAULT_AUTH_CONFIG, FRAMEWORKS } from './src/types';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const options = parseArgs(args);
  const { projectRoot, verbose, outputPath, authConfig } = options;

  try {
    // 現時点ではFastifyExtractorのみ
    const extractor = new FastifyExtractor();

    if (verbose) {
      console.log(`Using ${extractor.framework} extractor`);
    }

    // エンドポイント抽出
    const result = await extractor.extract({
      projectRoot,
      authConfig,
      verbose,
    });

    // YAML出力
    const generator = new YamlGenerator();
    const yaml = generator.generate(result);

    if (outputPath) {
      await Bun.write(outputPath, yaml);
      console.log(`Output written to: ${outputPath}`);
    }

    if (!outputPath) {
      console.log(yaml);
    }

    // サマリー出力
    console.log(`\n--- Summary ---`);
    console.log(`Framework: ${result.framework}`);
    console.log(`Total endpoints: ${result.authRequiredCount + result.publicCount}`);
    console.log(`Auth required: ${result.authRequiredCount}`);
    console.log(`Public: ${result.publicCount}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

function isFrameworkType(value: string): value is FrameworkType {
  const frameworkStrings: readonly string[] = FRAMEWORKS;
  return frameworkStrings.includes(value);
}

function parseArgs(args: string[]): CLIOptions {
  const projectRoot = args[0];
  if (!projectRoot) {
    throw new Error('Project root path is required');
  }

  const parseArgsRecursive = (
    index: number,
    acc: {
      projectRoot: string;
      framework?: FrameworkType;
      outputPath?: string;
      verbose?: boolean;
      authConfig?: AuthConfig;
    }
  ): typeof acc => {
    if (index >= args.length) {
      return acc;
    }

    const current = args[index];
    switch (current) {
      case '--framework': {
        const frameworkValue = args[index + 1];
        if (!frameworkValue) {
          throw new Error('--framework requires a value');
        }
        if (!isFrameworkType(frameworkValue)) {
          throw new Error(`Invalid framework: ${frameworkValue}. Supported: ${FRAMEWORKS.join(', ')}`);
        }
        return parseArgsRecursive(index + 2, {
          ...acc,
          framework: frameworkValue,
        });
      }
      case '--output': {
        const outputValue = args[index + 1];
        if (!outputValue) {
          throw new Error('--output requires a value');
        }
        return parseArgsRecursive(index + 2, {
          ...acc,
          outputPath: outputValue,
        });
      }
      case '--verbose':
        return parseArgsRecursive(index + 1, {
          ...acc,
          verbose: true,
        });
      case '--auth-middlewares': {
        const middlewaresValue = args[index + 1];
        if (!middlewaresValue) {
          throw new Error('--auth-middlewares requires a value');
        }
        const middlewares = middlewaresValue.split(',');
        return parseArgsRecursive(index + 2, {
          ...acc,
          authConfig: {
            ...DEFAULT_AUTH_CONFIG,
            middlewareNames: middlewares,
          },
        });
      }
      default:
        return parseArgsRecursive(index + 1, acc);
    }
  };

  return parseArgsRecursive(1, { projectRoot });
}

function printUsage() {
  console.log(`
Usage: bun run index.ts <project-path> [options]

Options:
  --framework <name>         Specify framework (fastify, nestjs, express)
  --output <file>            Output file path
  --verbose                  Enable verbose logging
  --auth-middlewares <list>  Comma-separated auth middleware names

Examples:
  bun run index.ts /path/to/project
  bun run index.ts /path/to/project --framework fastify
  bun run index.ts /path/to/project --auth-middlewares tokenVerification,authGuard
  `);
}

main();