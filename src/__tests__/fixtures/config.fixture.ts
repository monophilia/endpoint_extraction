export const YAML_CONFIG_FIXTURE = `
common:
  outputFormat: yaml
  extractResponses: true
  responseDepth: 3

nestjs:
  auth:
    guardPatterns:
      - ".*AuthGuard$"
    authGuards:
      - JwtAuthGuard
      - ApiKeyAuthGuard
    excludeGuards:
      - ThrottlerGuard
    publicDecorators:
      - Public
      - SkipAuth
    publicMetadataKeys:
      - isPublic
`;

export const JSON_CONFIG_FIXTURE = {
  common: {
    outputFormat: 'json',
    extractResponses: false,
  },
  nestjs: {
    auth: {
      authGuards: ['CustomGuard'],
    },
  },
};

export const PACKAGE_JSON_WITH_CONFIG = {
  name: 'test-project',
  extractorConfig: {
    nestjs: {
      auth: {
        publicDecorators: ['AllowAnonymous'],
      },
    },
  },
};
