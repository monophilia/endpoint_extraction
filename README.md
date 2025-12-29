# Endpoint Extractor

TypeScript ASTを使用してFastifyプロジェクトからエンドポイント情報を抽出し、YAML形式で出力するCLIツール。

## 機能

- Fastifyルート定義（`server.get/post/put/delete/patch`）の自動検出
- ジェネリック型引数からのパラメータ情報抽出（Params, Querystring, Body）
- 認証ミドルウェアの検出（preHandler, onRequest, preValidation）
- YAML形式での構造化出力

## ビルド

```bash
# 依存関係インストール
bun install

# シングルバイナリにコンパイル
bun build --compile index.ts --outfile endpoint-extractor
```

## 使用方法

### 基本

```bash
./endpoint-extractor <project-path> [options]
```

### オプション

| オプション | 説明 |
|-----------|------|
| `--framework <name>` | フレームワーク指定（fastify, nestjs, express） |
| `--output <file>` | 出力ファイルパス |
| `--verbose` | 詳細ログ出力 |
| `--auth-middlewares <list>` | 認証ミドルウェア名（カンマ区切り） |

### 例

```bash
# 標準出力に表示
./endpoint-extractor /path/to/fastify-project

# ファイルに出力
./endpoint-extractor /path/to/fastify-project --output endpoints.yaml

# カスタム認証ミドルウェアを指定
./endpoint-extractor /path/to/fastify-project --auth-middlewares tokenVerification,authGuard,adminOnly

# 詳細ログを有効化
./endpoint-extractor /path/to/fastify-project --verbose
```

## 入力例

### ルートファイル（routes/users.ts）

```typescript
import { FastifyInstance } from 'fastify';
import { tokenVerification } from '../middleware';

export default async function(server: FastifyInstance) {
  // 公開エンドポイント
  server.get('/', async (req, reply) => {
    return { message: 'User list' };
  });

  // パスパラメータ付き
  server.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    return { id: req.params.id };
  });

  // 認証必須 + ボディパラメータ
  server.post<{
    Body: { name: string; email?: string };
  }>(
    '/create',
    { preHandler: [tokenVerification] },
    async (req, reply) => {
      return { created: true };
    }
  );

  // クエリパラメータ
  server.get<{
    Querystring: { page?: number; limit?: number };
  }>('/search', async (req, reply) => {
    return { results: [] };
  });
}
```

## 出力例

### YAML出力

```yaml
_meta:
  framework: fastify
  projectRoot: /path/to/fastify-project
  extractedAt: "2025-12-30T05:30:00.000Z"
  totalEndpoints: 4
  authRequiredCount: 1
  publicCount: 3

/users:
  /:
    METHOD: GET
    requiresAuth: false

  /:id:
    METHOD: GET
    pathParams:
      id: string
    requiresAuth: false

  /create:
    METHOD: POST
    bodyParams:
      name: string
      email: string | undefined
    requiresAuth: true
    authMiddlewares:
      - tokenVerification

  /search:
    METHOD: GET
    queryParams:
      page: number | undefined
      limit: number | undefined
    requiresAuth: false
```

### CLIサマリー出力

```
--- Summary ---
Framework: fastify
Total endpoints: 4
Auth required: 1
Public: 3
```

## 認証検出

以下のミドルウェア名がデフォルトで認証として検出されます：

- `tokenVerification`
- `authGuard`
- `authenticate`
- `requireAuth`
- `verifyToken`
- `isAuthenticated`
- `authMiddleware`
- `jwtVerify`

部分一致で検出されるため、`customTokenVerification`のような名前も検出されます。

### 対応フックポイント

- `preHandler`
- `onRequest`
- `preValidation`

## テスト

```bash
bun test
```

## 開発時の実行

ビルドせずに直接実行する場合：

```bash
bun run index.ts <project-path> [options]
```

## 今後の拡張予定

- NestJS対応
- Express対応
- OpenAPI仕様出力

## 技術スタック

- Bun
- TypeScript
- ts-morph（AST解析）
- yaml（YAML生成）
