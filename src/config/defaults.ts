import type { ExtractorConfig } from '../types/config';

export const DEFAULT_EXTRACTOR_CONFIG: ExtractorConfig = {
  common: {
    outputFormat: 'yaml',
    extractResponses: false,
    responseDepth: 2,
  },
  nestjs: {
    auth: {
      guardPatterns: [
        '.*AuthGuard$',
        '.*JwtGuard$',
        '.*SessionGuard$',
        '.*TokenGuard$',
      ],
      authGuards: [],
      excludeGuards: [
        'ThrottlerGuard',
        'RateLimitGuard',
      ],
      publicDecorators: [
        'Public',
        'SkipAuth',
        'AllowAnonymous',
      ],
      publicMetadataKeys: [
        'isPublic',
        'IS_PUBLIC_KEY',
        'skipAuth',
      ],
    },
    params: {
      customDecorators: [],
    },
  },
  fastify: {
    auth: {
      middlewareNames: [
        'authenticate',
        'verifyJWT',
        'requireAuth',
      ],
    },
  },
};
