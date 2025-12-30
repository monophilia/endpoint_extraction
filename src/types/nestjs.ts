// src/types/nestjs.ts

import type { HttpMethod } from './http';

/**
 * HTTPメソッドデコレーターの種類
 */
export type MethodDecoratorType =
  | 'Get'
  | 'Post'
  | 'Put'
  | 'Delete'
  | 'Patch'
  | 'Options'
  | 'Head'
  | 'All';

/**
 * デコレーター名からHttpMethodへの変換マップ
 */
export const HTTP_METHOD_MAP: Record<MethodDecoratorType, HttpMethod | 'OPTIONS' | 'HEAD' | 'ALL'> = {
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Delete: 'DELETE',
  Patch: 'PATCH',
  Options: 'OPTIONS',
  Head: 'HEAD',
  All: 'ALL',
} as const;

/**
 * HTTPメソッドデコレーターの情報
 */
export type MethodDecoratorInfo = {
  readonly type: MethodDecoratorType;
  readonly path: string;
  readonly lineNumber: number;
};

/**
 * パラメーターデコレーターの種類
 */
export type ParamDecoratorType =
  | 'Param'
  | 'Body'
  | 'Query'
  | 'Headers'
  | 'Req'
  | 'Res';

/**
 * パラメーターデコレーターの情報
 */
export type ParamDecoratorInfo = {
  readonly type: ParamDecoratorType;
  readonly argName?: string;
  readonly paramName: string;
  readonly paramType: string;
  readonly required: boolean;
};

/**
 * UseGuardsデコレーターの情報
 */
export type GuardDecoratorInfo = {
  readonly guards: readonly string[];
  readonly level: 'class' | 'method';
  readonly lineNumber: number;
};

/**
 * SetMetadata系デコレーターの情報
 */
export type MetadataDecoratorInfo = {
  readonly name: string;
  readonly key: string;
  readonly value: unknown;
  readonly lineNumber: number;
};

/**
 * コントローラークラスの解析結果
 */
export type ControllerInfo = {
  readonly name: string;
  readonly basePath: string;
  readonly classGuards: readonly GuardDecoratorInfo[];
  readonly classMetadata: readonly MetadataDecoratorInfo[];
  readonly methods: readonly ControllerMethodInfo[];
  readonly sourceFile: string;
  readonly lineNumber: number;
};

/**
 * コントローラーメソッドの解析結果
 */
export type ControllerMethodInfo = {
  readonly name: string;
  readonly httpMethod: MethodDecoratorInfo;
  readonly params: readonly ParamDecoratorInfo[];
  readonly guards: readonly GuardDecoratorInfo[];
  readonly metadata: readonly MetadataDecoratorInfo[];
  readonly lineNumber: number;
};

/**
 * モジュールの解析結果
 */
export type ModuleInfo = {
  readonly name: string;
  readonly controllers: readonly ControllerRegistration[];
  readonly importedModules: readonly ModuleRegistration[];
  readonly globalGuards: readonly string[];
  readonly sourceFile: string;
};

/**
 * コントローラー登録情報
 */
export type ControllerRegistration = {
  readonly name: string;
  readonly importPath: string;
  readonly resolvedPath: string;
};

/**
 * モジュール登録情報
 */
export type ModuleRegistration = {
  readonly name: string;
  readonly importPath: string;
  readonly resolvedPath: string;
};

/**
 * 認証ガード判定結果
 */
export type AuthGuardResult = {
  readonly isAuth: boolean;
  readonly confidence: 'high' | 'medium' | 'low';
  readonly reason: 'config' | 'pattern' | 'inheritance' | 'excluded' | 'unknown';
};

/**
 * 検出されたガード情報
 */
export type DetectedGuard = {
  readonly name: string;
  readonly level: 'class' | 'method' | 'global';
  readonly isAuthGuard: boolean;
  readonly reason: 'config' | 'pattern' | 'inheritance' | 'excluded' | 'unknown';
};

/**
 * エンドポイントの認証情報
 */
export type EndpointAuth = {
  readonly required: boolean | 'unknown';
  readonly confidence: 'high' | 'medium' | 'low';
  readonly guards: readonly DetectedGuard[];
};
