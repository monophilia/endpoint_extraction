// AuthGuardを継承するガード
export const JWT_AUTH_GUARD_FIXTURE = `
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
`;

// 間接継承
export const CUSTOM_AUTH_GUARD_FIXTURE = `
import { Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class CustomAuthGuard extends JwtAuthGuard {}
`;

// 認証ガードではないガード
export const THROTTLE_GUARD_FIXTURE = `
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ThrottlerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
`;

// RolesGuard
export const ROLES_GUARD_FIXTURE = `
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    return true;
  }
}
`;
