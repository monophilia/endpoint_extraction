import { parse as parseYaml } from 'yaml';
import type { ExtractorConfig } from '../types/config';
import { DEFAULT_EXTRACTOR_CONFIG } from './defaults';

type ObjectRecord = Record<string, unknown>;

export class ConfigLoader {
  /**
   * 設定を読み込む
   */
  async load(
    projectRoot: string,
    cliConfigPath?: string,
  ): Promise<ExtractorConfig> {
    const configs: ExtractorConfig[] = [];

    // 1. CLI指定の設定ファイル
    const cliConfig = cliConfigPath ? await this.loadFile(cliConfigPath) : null;
    if (cliConfig) configs.push(cliConfig);

    // 2. extractor.config.yaml
    const yamlConfig = await this.loadFile(`${projectRoot}/extractor.config.yaml`);
    if (yamlConfig) configs.push(yamlConfig);

    // 3. extractor.config.json
    const jsonConfig = await this.loadFile(`${projectRoot}/extractor.config.json`);
    if (jsonConfig) configs.push(jsonConfig);

    // 4. package.json の extractorConfig
    const pkgConfig = await this.loadFromPackageJson(projectRoot);
    if (pkgConfig) configs.push(pkgConfig);

    // 5. デフォルト値
    configs.push(DEFAULT_EXTRACTOR_CONFIG);

    // マージ（先頭が優先）
    return this.mergeConfigs(configs);
  }

  private async loadFile(filePath: string): Promise<ExtractorConfig | null> {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return null;

    const content = await file.text();

    const parsed = filePath.endsWith('.yaml') || filePath.endsWith('.yml')
      ? parseYaml(content)
      : JSON.parse(content);

    return parsed;
  }

  private async loadFromPackageJson(projectRoot: string): Promise<ExtractorConfig | null> {
    const pkgPath = `${projectRoot}/package.json`;
    const file = Bun.file(pkgPath);
    if (!(await file.exists())) return null;

    const pkg = JSON.parse(await file.text());
    return pkg.extractorConfig ?? null;
  }

  private mergeConfigs(configs: ExtractorConfig[]): ExtractorConfig {
    const merged = configs.reduceRight((acc, config) =>
      this.deepMerge(acc, config)
    );
    return merged;
  }

  private deepMerge<T extends ObjectRecord>(base: T, override: T): ObjectRecord {
    const isObject = (value: unknown): value is ObjectRecord =>
      typeof value === 'object' && value !== null && !Array.isArray(value);

    const mergedEntries = Object.keys(override).map((key): [string, unknown] => {
      const baseValue = base[key];
      const overrideValue = override[key];

      const shouldDeepMerge = isObject(baseValue) && isObject(overrideValue);

      if (shouldDeepMerge) {
        return [key, this.deepMerge(baseValue, overrideValue)];
      }

      if (overrideValue !== undefined) {
        return [key, overrideValue];
      }

      return [key, baseValue];
    });

    const mergedFromOverride = Object.fromEntries(mergedEntries);
    const baseOnlyKeys = Object.keys(base).filter((key) => !(key in override));
    const baseOnlyEntries = baseOnlyKeys.map((key): [string, unknown] => [key, base[key]]);

    return { ...Object.fromEntries(baseOnlyEntries), ...mergedFromOverride };
  }
}
