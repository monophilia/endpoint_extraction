import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ConfigLoader } from '../../config/loader';
import { DEFAULT_EXTRACTOR_CONFIG } from '../../config/defaults';
import {
  YAML_CONFIG_FIXTURE,
  JSON_CONFIG_FIXTURE,
  PACKAGE_JSON_WITH_CONFIG,
} from '../fixtures/config.fixture';
import { rmSync } from 'node:fs';

describe('ConfigLoader', () => {
  let loader: ConfigLoader;
  let tempDir: string;

  beforeEach(async () => {
    loader = new ConfigLoader();
    // テスト用一時ディレクトリを作成
    tempDir = `/tmp/config-test-${Date.now()}`;
    await Bun.write(`${tempDir}/.gitkeep`, '');
  });

  afterEach(async () => {
    // クリーンアップ
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ディレクトリが存在しない場合は無視
    }
  });

  describe('load', () => {
    it('YAML設定ファイルを読み込む', async () => {
      await Bun.write(`${tempDir}/extractor.config.yaml`, YAML_CONFIG_FIXTURE);

      const config = await loader.load(tempDir);

      expect(config.common?.outputFormat).toBe('yaml');
      expect(config.common?.extractResponses).toBe(true);
      expect(config.nestjs?.auth?.authGuards).toContain('JwtAuthGuard');
    });

    it('JSON設定ファイルを読み込む', async () => {
      await Bun.write(`${tempDir}/extractor.config.json`, JSON.stringify(JSON_CONFIG_FIXTURE));

      const config = await loader.load(tempDir);

      expect(config.common?.outputFormat).toBe('json');
      expect(config.nestjs?.auth?.authGuards).toContain('CustomGuard');
    });

    it('package.jsonのextractorConfigを読み込む', async () => {
      await Bun.write(`${tempDir}/package.json`, JSON.stringify(PACKAGE_JSON_WITH_CONFIG));

      const config = await loader.load(tempDir);

      expect(config.nestjs?.auth?.publicDecorators).toContain('AllowAnonymous');
    });

    it('設定ファイルがない場合はデフォルト値を返す', async () => {
      const config = await loader.load(tempDir);

      expect(config.common?.outputFormat).toBe(DEFAULT_EXTRACTOR_CONFIG.common?.outputFormat);
    });

    it('CLI指定の設定ファイルが最優先', async () => {
      const customConfigPath = `${tempDir}/custom.yaml`;
      await Bun.write(customConfigPath, YAML_CONFIG_FIXTURE);
      await Bun.write(`${tempDir}/extractor.config.json`, JSON.stringify({ common: { outputFormat: 'json' } }));

      const config = await loader.load(tempDir, customConfigPath);

      expect(config.common?.outputFormat).toBe('yaml'); // YAML_CONFIG_FIXTUREの値
    });

    it('YAMLがJSONより優先される', async () => {
      await Bun.write(`${tempDir}/extractor.config.yaml`, 'common:\n  outputFormat: yaml');
      await Bun.write(`${tempDir}/extractor.config.json`, JSON.stringify({ common: { outputFormat: 'json' } }));

      const config = await loader.load(tempDir);

      expect(config.common?.outputFormat).toBe('yaml');
    });

    it('設定をマージする', async () => {
      await Bun.write(`${tempDir}/extractor.config.yaml`, 'nestjs:\n  auth:\n    authGuards:\n      - CustomGuard');

      const config = await loader.load(tempDir);

      // カスタム設定
      expect(config.nestjs?.auth?.authGuards).toContain('CustomGuard');
      // デフォルト値も残る
      expect(config.nestjs?.auth?.publicDecorators).toContain('Public');
    });
  });
});
