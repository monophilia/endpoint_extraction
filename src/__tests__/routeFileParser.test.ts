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
    const endpoint = endpoints[0];
    expect(endpoint).toBeDefined();
    expect(endpoint!.path).toBe('/');
    expect(endpoint!.method).toBe('GET');
    expect(endpoint!.pathParams).toEqual([]);
    expect(endpoint!.queryParams).toEqual([]);
    expect(endpoint!.bodyParams).toEqual([]);
    expect(endpoint!.auth.required).toBe(false);
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
    const endpoint = endpoints[0];
    expect(endpoint).toBeDefined();
    expect(endpoint!.path).toBe('/:id');
    expect(endpoint!.pathParams.length).toBe(1);
    const pathParam = endpoint!.pathParams[0];
    expect(pathParam).toBeDefined();
    expect(pathParam!.name).toBe('id');
    expect(pathParam!.type).toBe('string');
    expect(pathParam!.required).toBe(true);
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
    const endpoint = endpoints[0];
    expect(endpoint).toBeDefined();
    expect(endpoint!.method).toBe('POST');
    expect(endpoint!.auth.required).toBe(true);
    expect(endpoint!.auth.middlewares).toContain('tokenVerification');
    expect(endpoint!.auth.hookPoint).toBe('preHandler');
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
    expect(endpoints[0]).toBeDefined();
    expect(endpoints[1]).toBeDefined();
    expect(endpoints[2]).toBeDefined();
    expect(endpoints[3]).toBeDefined();
    expect(endpoints[4]).toBeDefined();
    expect(endpoints[0]!.method).toBe('GET');
    expect(endpoints[1]!.method).toBe('POST');
    expect(endpoints[2]!.method).toBe('PUT');
    expect(endpoints[3]!.method).toBe('DELETE');
    expect(endpoints[4]!.method).toBe('PATCH');
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
    expect(endpoints[0]).toBeDefined();
    expect(endpoints[1]).toBeDefined();
    expect(endpoints[0]!.lineNumber).toBe(5);
    expect(endpoints[1]!.lineNumber).toBe(7);
  });
});
