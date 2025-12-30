// src/types/index.ts

export type { FrameworkType, FrameworkDetectionResult } from './framework';
export { FRAMEWORKS } from './framework';

export type { HttpMethod } from './http';
export { HTTP_METHODS } from './http';

export type { ParamInfo } from './param';

export type { AuthConfig, FastifyAuthHook, AuthInfo } from './auth';
export { DEFAULT_AUTH_CONFIG, DEFAULT_AUTH_MIDDLEWARES, FASTIFY_AUTH_HOOKS } from './auth';

export type { EndpointInfo } from './endpoint';
export type { ExtractedEndpoints, PrefixedEndpoints } from './output';
export type { YamlEndpoint, YamlParams, YamlSuccessResponse, YamlErrorResponse, YamlResponses } from './yaml';

export type { ExtractorOptions, CLIOptions } from './options';

export type { ResponseSource, ResponseInfo, ErrorResponseInfo, EndpointResponses } from './response';
