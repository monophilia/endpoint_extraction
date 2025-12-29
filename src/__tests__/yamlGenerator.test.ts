// src/__tests__/yamlGenerator.test.ts

import { describe, expect, test } from 'bun:test';
import { YamlGenerator } from '../generators/yamlGenerator';
import type { ExtractedEndpoints } from '../types';

describe('YamlGenerator', () => {
  test('should generate YAML with meta information', () => {
    const generator = new YamlGenerator();
    const data: ExtractedEndpoints = {
      framework: 'fastify',
      projectRoot: '/test/project',
      extractedAt: '2025-12-29T12:00:00.000Z',
      routes: [],
      authRequiredCount: 0,
      publicCount: 0,
    };

    const yaml = generator.generate(data);

    expect(yaml).toContain('_meta:');
    expect(yaml).toContain('framework: fastify');
    expect(yaml).toContain('projectRoot: /test/project');
    expect(yaml).toContain('extractedAt: 2025-12-29T12:00:00.000Z');
    expect(yaml).toContain('totalEndpoints: 0');
    expect(yaml).toContain('authRequiredCount: 0');
    expect(yaml).toContain('publicCount: 0');
  });

  test('should generate YAML with endpoints', () => {
    const generator = new YamlGenerator();
    const data: ExtractedEndpoints = {
      framework: 'fastify',
      projectRoot: '/test/project',
      extractedAt: '2025-12-29T12:00:00.000Z',
      routes: [
        {
          prefix: '/users',
          endpoints: [
            {
              method: 'GET',
              path: '/:id',
              pathParams: [{ name: 'id', type: 'string', required: true }],
              queryParams: [],
              bodyParams: [],
              auth: { required: true, middlewares: [] },
              sourceFile: '/test/users.ts',
              lineNumber: 10,
            },
          ],
        },
      ],
      authRequiredCount: 1,
      publicCount: 0,
    };

    const yaml = generator.generate(data);

    expect(yaml).toContain('/users:');
    expect(yaml).toContain('endpoints:');
    expect(yaml).toContain('/:id:');
    expect(yaml).toContain('METHOD: GET');
    expect(yaml).toContain('pathParams:');
    expect(yaml).toContain('id: string');
    expect(yaml).toContain('requiresAuth: true');
  });

  test('should handle optional parameters with undefined suffix', () => {
    const generator = new YamlGenerator();
    const data: ExtractedEndpoints = {
      framework: 'fastify',
      projectRoot: '/test/project',
      extractedAt: '2025-12-29T12:00:00.000Z',
      routes: [
        {
          prefix: '/rooms',
          endpoints: [
            {
              method: 'GET',
              path: '/',
              pathParams: [],
              queryParams: [
                { name: 'name', type: 'string', required: false },
                { name: 'roomId', type: 'string', required: false },
              ],
              bodyParams: [],
              auth: { required: true, middlewares: [] },
              sourceFile: '/test/rooms.ts',
              lineNumber: 5,
            },
          ],
        },
      ],
      authRequiredCount: 1,
      publicCount: 0,
    };

    const yaml = generator.generate(data);

    expect(yaml).toContain('queryParams:');
    expect(yaml).toContain('name: string | undefined');
    expect(yaml).toContain('roomId: string | undefined');
  });

  test('should include auth middlewares when present', () => {
    const generator = new YamlGenerator();
    const data: ExtractedEndpoints = {
      framework: 'fastify',
      projectRoot: '/test/project',
      extractedAt: '2025-12-29T12:00:00.000Z',
      routes: [
        {
          prefix: '/admin',
          endpoints: [
            {
              method: 'POST',
              path: '/users',
              pathParams: [],
              queryParams: [],
              bodyParams: [
                { name: 'name', type: 'string', required: true },
                { name: 'email', type: 'string', required: true },
              ],
              auth: { required: true, middlewares: ['tokenVerification', 'adminCheck'] },
              sourceFile: '/test/admin.ts',
              lineNumber: 15,
            },
          ],
        },
      ],
      authRequiredCount: 1,
      publicCount: 0,
    };

    const yaml = generator.generate(data);

    expect(yaml).toContain('authMiddlewares:');
    expect(yaml).toContain('tokenVerification');
    expect(yaml).toContain('adminCheck');
  });

  test('should handle multiple routes and endpoints', () => {
    const generator = new YamlGenerator();
    const data: ExtractedEndpoints = {
      framework: 'fastify',
      projectRoot: '/test/project',
      extractedAt: '2025-12-29T12:00:00.000Z',
      routes: [
        {
          prefix: '/users',
          endpoints: [
            {
              method: 'GET',
              path: '/:id',
              pathParams: [{ name: 'id', type: 'string', required: true }],
              queryParams: [],
              bodyParams: [],
              auth: { required: true, middlewares: [] },
              sourceFile: '/test/users.ts',
              lineNumber: 10,
            },
            {
              method: 'POST',
              path: '/',
              pathParams: [],
              queryParams: [],
              bodyParams: [{ name: 'name', type: 'string', required: true }],
              auth: { required: false, middlewares: [] },
              sourceFile: '/test/users.ts',
              lineNumber: 20,
            },
          ],
        },
        {
          prefix: '/rooms',
          endpoints: [
            {
              method: 'GET',
              path: '/',
              pathParams: [],
              queryParams: [],
              bodyParams: [],
              auth: { required: true, middlewares: [] },
              sourceFile: '/test/rooms.ts',
              lineNumber: 5,
            },
          ],
        },
      ],
      authRequiredCount: 2,
      publicCount: 1,
    };

    const yaml = generator.generate(data);

    expect(yaml).toContain('/users:');
    expect(yaml).toContain('/rooms:');
    expect(yaml).toContain('totalEndpoints: 3');
    expect(yaml).toContain('authRequiredCount: 2');
    expect(yaml).toContain('publicCount: 1');
  });

  test('should not include optional fields when empty', () => {
    const generator = new YamlGenerator();
    const data: ExtractedEndpoints = {
      framework: 'fastify',
      projectRoot: '/test/project',
      extractedAt: '2025-12-29T12:00:00.000Z',
      routes: [
        {
          prefix: '/health',
          endpoints: [
            {
              method: 'GET',
              path: '/',
              pathParams: [],
              queryParams: [],
              bodyParams: [],
              auth: { required: false, middlewares: [] },
              sourceFile: '/test/health.ts',
              lineNumber: 3,
            },
          ],
        },
      ],
      authRequiredCount: 0,
      publicCount: 1,
    };

    const yaml = generator.generate(data);

    expect(yaml).not.toContain('pathParams:');
    expect(yaml).not.toContain('queryParams:');
    expect(yaml).not.toContain('bodyParams:');
    expect(yaml).not.toContain('authMiddlewares:');
    expect(yaml).toContain('requiresAuth: false');
  });
});
