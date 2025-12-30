// 基本的なコントローラー
export const BASIC_CONTROLLER_FIXTURE = `
import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { id };
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return createUserDto;
  }

  @Get('search')
  search(@Query('name') name: string, @Query('age') age?: number) {
    return { name, age };
  }
}

interface CreateUserDto {
  name: string;
  email: string;
}
`;

// 認証付きコントローラー
export const AUTH_CONTROLLER_FIXTURE = `
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

@Controller('protected')
@UseGuards(AuthGuard)
export class ProtectedController {
  @Get()
  getProtected() {
    return { message: 'protected' };
  }
}
`;

// Publicデコレーター付きコントローラー
export const PUBLIC_ROUTE_FIXTURE = `
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { Public } from './public.decorator';

@Controller('mixed')
@UseGuards(AuthGuard)
export class MixedController {
  @Get('private')
  privateRoute() {
    return { access: 'private' };
  }

  @Public()
  @Get('public')
  publicRoute() {
    return { access: 'public' };
  }
}
`;

// メソッドレベルガード
export const METHOD_GUARD_FIXTURE = `
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

@Controller('partial')
export class PartialController {
  @Get()
  publicGet() {
    return { public: true };
  }

  @Post()
  @UseGuards(AuthGuard)
  protectedPost() {
    return { protected: true };
  }
}
`;

// Rolesデコレーター付き
export const ROLES_FIXTURE = `
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  @Get()
  @Roles('admin')
  adminOnly() {
    return { role: 'admin' };
  }

  @Get('moderator')
  @Roles('admin', 'moderator')
  moderatorAccess() {
    return { roles: ['admin', 'moderator'] };
  }
}
`;

// モジュール定義
export const MODULE_FIXTURE = `
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersController } from './users.controller';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';

@Module({
  controllers: [UsersController, AuthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
`;

// グローバルガードなしモジュール
export const MODULE_NO_GUARD_FIXTURE = `
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
})
export class AppModule {}
`;

// 複数パスパラメーター
export const MULTIPLE_PARAMS_FIXTURE = `
import { Controller, Get, Param } from '@nestjs/common';

@Controller('groups/:groupId/users')
export class GroupUsersController {
  @Get(':userId')
  getUser(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    return { groupId, userId };
  }
}
`;

// ネストされたパス
export const NESTED_PATH_FIXTURE = `
import { Controller, Get, Post, Put, Delete } from '@nestjs/common';

@Controller('api/v1/resources')
export class ResourcesController {
  @Get()
  list() {}

  @Get(':id')
  get() {}

  @Post()
  create() {}

  @Put(':id')
  update() {}

  @Delete(':id')
  delete() {}
}
`;
