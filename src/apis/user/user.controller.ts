import { Body, Controller, Delete, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { User } from './user.entity';
import { UserCreateDto, UserDeleteDto } from './user.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { JwtReqUser } from 'src/commons/interface/req.interface';

@ApiTags('User')
@Controller('/user')
export class UserController {
  constructor(
    private readonly userService: UserService, //
  ) {}

  @ApiOperation({
    summary: 'userID로 user 찾기',
    description: '해당하는 userID의 user를 찾는다.',
  })
  @ApiQuery({ name: 'userID', description: '찾고 싶은 user의 ID' })
  @UseGuards(AuthGuard('access'))
  @Get('/userFindOneWithUserID')
  userFindOneWithUserID(
    @Req() req: Request & JwtReqUser, //
  ): Promise<User> {
    return this.userService.findOneWithUserID({ id: req.user.id });
  }

  @ApiOperation({
    summary: 'name으로 user 찾기',
    description: '해당하는 name의 user를 찾는다.',
  })
  @ApiQuery({ name: 'name', description: '찾고 싶은 user의 name' })
  @Get('/userFindOneWithName')
  userFindOneWithName(
    @Query('name') name: string, //
  ): Promise<User> {
    return this.userService.findOneWithName({ name });
  }

  @ApiOperation({
    summary: 'email으로 user 찾기',
    description: '해당하는 email의 user를 찾는다.',
  })
  @ApiQuery({ name: 'email', description: '찾고 싶은 user의 email' })
  @Get('/userFindOneWithEmail')
  userFindOneWithEmail(
    @Query('email') email: string, //
  ): Promise<User> {
    return this.userService.findOneWithEmail({ email });
  }

  @ApiOperation({
    summary: 'user 등록하기',
    description: '회원 가입에 성공하면 user를 DB에 생성한다.',
  })
  @Post('/userCreate')
  userCreate(
    @Body() userCreateDto: UserCreateDto, //
  ): Promise<User> {
    return this.userService.create({ userCreateDto });
  }

  @ApiOperation({
    summary: 'user 소프트 삭제하기',
    description: '회원 탈퇴에 성공하면 user를 소프트 삭제한다.',
  })
  @UseGuards(AuthGuard('access'))
  @Delete('/userSoftDelete')
  userSoftDelete(
    @Req() req: Request & JwtReqUser, //
  ): Promise<boolean> {
    return this.userService.softDelete({ userID: req.user.id, headers: req.headers });
  }

  @ApiOperation({
    summary: 'user 하드 삭제하기',
    description: 'user를 DB에서 완전히 삭제한다.',
  })
  @Delete('/userDelete')
  userDelete(
    @Body() userDeleteDto: UserDeleteDto, //
  ): Promise<boolean> {
    return this.userService.delete({ userDeleteDto });
  }
}
