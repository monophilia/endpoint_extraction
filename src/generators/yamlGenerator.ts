// src/generators/yamlGenerator.ts

import YAML from 'yaml';
import type {
  ExtractedEndpoints,
  EndpointInfo,
  ParamInfo,
  YamlEndpoint,
  YamlParams,
} from '../types';

export class YamlGenerator {
  generate(data: ExtractedEndpoints): string {
    const output = this.buildYamlOutput(data);
    return YAML.stringify(output, {
      indent: 2,
      lineWidth: 0,
    });
  }

  private buildYamlOutput(data: ExtractedEndpoints): Record<string, unknown> {
    const meta = {
      framework: data.framework,
      projectRoot: data.projectRoot,
      extractedAt: data.extractedAt,
      totalEndpoints: data.routes.reduce(
        (sum, route) => sum + route.endpoints.length,
        0
      ),
      authRequiredCount: data.authRequiredCount,
      publicCount: data.publicCount,
    };

    const routes = data.routes.reduce<Record<string, { endpoints: Record<string, YamlEndpoint> }>>(
      (acc, route) => ({
        ...acc,
        [route.prefix]: this.buildYamlRoute(route.endpoints),
      }),
      {}
    );

    return {
      _meta: meta,
      ...routes,
    };
  }

  private buildYamlRoute(endpoints: readonly EndpointInfo[]): { endpoints: Record<string, YamlEndpoint> } {
    const endpointsMap = endpoints.reduce<Record<string, YamlEndpoint>>(
      (acc, endpoint) => ({
        ...acc,
        [endpoint.path]: this.buildYamlEndpoint(endpoint),
      }),
      {}
    );

    return { endpoints: endpointsMap };
  }

  private buildYamlEndpoint(endpoint: EndpointInfo): YamlEndpoint {
    const base = {
      METHOD: endpoint.method,
      requiresAuth: endpoint.auth.required,
    };

    const withPathParams = endpoint.pathParams.length > 0
      ? { ...base, pathParams: this.buildYamlParams(endpoint.pathParams) }
      : base;

    const withQueryParams = endpoint.queryParams.length > 0
      ? { ...withPathParams, queryParams: this.buildYamlParams(endpoint.queryParams) }
      : withPathParams;

    const withBodyParams = endpoint.bodyParams.length > 0
      ? { ...withQueryParams, bodyParams: this.buildYamlParams(endpoint.bodyParams) }
      : withQueryParams;

    const result = endpoint.auth.middlewares.length > 0
      ? { ...withBodyParams, authMiddlewares: endpoint.auth.middlewares }
      : withBodyParams;

    return result;
  }

  private buildYamlParams(params: readonly ParamInfo[]): YamlParams {
    return params.reduce<Record<string, string>>(
      (acc, param) => {
        const typeStr = param.required
          ? param.type
          : `${param.type} | undefined`;
        return { ...acc, [param.name]: typeStr };
      },
      {}
    );
  }
}
