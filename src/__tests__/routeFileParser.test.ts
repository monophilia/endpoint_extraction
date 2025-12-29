// src/__tests__/routeFileParser.test.ts

import { describe, test, expect } from 'bun:test';
import { RouteFileParser } from '../extractors/fastify/routeFileParser';

describe('RouteFileParser', () => {
  test('シンプルなGETエンドポイントを解析', () => {
    const parser = new RouteFileParser();
    const source = `
      import { FastifyInstance } from 'fastify';

      export default async function(server: FastifyInstance) {
        server.get('/', async (req, reply) => {
          return { message: 'hello' };
        });
      }
    `;

    const endpoints = parser.parseFromSource(source, 'test.ts');

    expect(endpoints.length).toBe(1);
    expect(endpoints[0].path).toBe('/');
    expect(endpoints[0].method).toBe('GET');
    expect(endpoints[0].pathParams).toEqual([]);
    expect(endpoints[0].queryParams).toEqual([]);
    expect(endpoints[0].bodyParams).toEqual([]);
    expect(endpoints[0].auth.required).toBe(false);
  });

  test('パスパラメータを含むエンドポイントを解析', () => {
    const parser = new RouteFileParser();
    const source = `
      import { FastifyInstance } from 'fastify';

      export default async function(server: FastifyInstance) {
        server.get('/:id', async (req, reply) => {
          return { id: req.params.id };
        });
      }
    `;

    const endpoints = parser.parseFromSource(source, 'test.ts');

    expect(endpoints.length).toBe(1);
    expect(endpoints[0].path).toBe('/:id');
    expect(endpoints[0].pathParams.length).toBe(1);
    expect(endpoints[0].pathParams[0].name).toBe('id');
    expect(endpoints[0].pathParams[0].type).toBe('string');
    expect(endpoints[0].pathParams[0].required).toBe(true);
  });

  test('認証が必要なエンドポイントを解析', () => {
    const parser = new RouteFileParser();
    const source = `
      import { FastifyInstance } from 'fastify';
      import { tokenVerification } from './middleware';

      export default async function(server: FastifyInstance) {
        server.post('/create', { preHandler: [tokenVerification] }, async (req, reply) => {
          return { created: true };
        });
      }
    `;

    const endpoints = parser.parseFromSource(source, 'test.ts');

    expect(endpoints.length).toBe(1);
    expect(endpoints[0].method).toBe('POST');
    expect(endpoints[0].auth.required).toBe(true);
    expect(endpoints[0].auth.middlewares).toContain('tokenVerification');
    expect(endpoints[0].auth.hookPoint).toBe('preHandler');
  });

  test('複数のHTTPメソッドを解析', () => {
    const parser = new RouteFileParser();
    const source = `
      import { FastifyInstance } from 'fastify';

      export default async function(server: FastifyInstance) {
        server.get('/users', async (req, reply) => {});
        server.post('/users', async (req, reply) => {});
        server.put('/users/:id', async (req, reply) => {});
        server.delete('/users/:id', async (req, reply) => {});
        server.patch('/users/:id', async (req, reply) => {});
      }
    `;

    const endpoints = parser.parseFromSource(source, 'test.ts');

    expect(endpoints.length).toBe(5);
    expect(endpoints[0].method).toBe('GET');
    expect(endpoints[1].method).toBe('POST');
    expect(endpoints[2].method).toBe('PUT');
    expect(endpoints[3].method).toBe('DELETE');
    expect(endpoints[4].method).toBe('PATCH');
  });

  test('行番号を正しく取得', () => {
    const parser = new RouteFileParser();
    const source = `
      import { FastifyInstance } from 'fastify';

      export default async function(server: FastifyInstance) {
        server.get('/', async (req, reply) => {});

        server.post('/create', async (req, reply) => {});
      }
    `;

    const endpoints = parser.parseFromSource(source, 'test.ts');

    expect(endpoints.length).toBe(2);
    expect(endpoints[0].lineNumber).toBe(5);
    expect(endpoints[1].lineNumber).toBe(7);
  });
});
