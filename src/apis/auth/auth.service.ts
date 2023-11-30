import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  IAuthServiceGetAccessToken,
  IAuthServiceLogin,
  IAuthServiceLogout,
  IAuthServiceRestoreAccessToken,
  IAuthServiceSendToken,
  IAuthServiceSetRefreshToken,
  IAuthServiceSocialLogin,
  IAuthServiceTokenEXP,
} from './auth.interface';
import coolsms from 'coolsms-node-sdk';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as jwt from 'jsonwebtoken';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AuthService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async sendToken({ authSendTokenDto }: IAuthServiceSendToken): Promise<void> {
    const { tokenNumber, phone1, phone2, phone3 } = authSendTokenDto;

    const messageService = new coolsms(process.env.COOLSMS_KEY, process.env.COOLSMS_SECRET);

    await messageService.sendOne({
      to: phone1 + phone2 + phone3,
      from: process.env.COOLSMS_FROM_NUMBER,
      text: `요청하신 인증 번호는 ${tokenNumber} 입니다.`,
      autoTypeDetect: true,
    });
  }

  async login({ authLoginDto, res }: IAuthServiceLogin): Promise<string> {
    const { email, password } = authLoginDto;

    const user = await this.userService.findOneWithEmail({ email });
    if (!user) throw new UnauthorizedException('회원 가입 되지 않은 이메일입니다.');

    const isAuth = await bcrypt.compare(password, user.password);
    if (!isAuth) throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');

    this.setRefreshToken({ user, res });

    return this.getAccessToken({ user });
  }

  restoreAccessToken({ user }: IAuthServiceRestoreAccessToken): string {
    return this.getAccessToken({ user });
  }

  setRefreshToken({ user, res }: IAuthServiceSetRefreshToken): void {
    const refreshToken = this.jwtService.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      { secret: process.env.JWT_REFRESH_KEY, expiresIn: '1w' },
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none', // 배포 전 한 번 더 보기
      domain: '.localhost',
      path: '/',
      expires: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  }

  getAccessToken({ user }: IAuthServiceGetAccessToken): string {
    return this.jwtService.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      { secret: process.env.JWT_ACCESS_KEY, expiresIn: '1h' },
    );
  }

  async socialLogin({ req, res }: IAuthServiceSocialLogin): Promise<void> {
    let user = await this.userService.findOneWithEmail({
      email: req.user.email,
    });

    if (!user) {
      user = await this.userService.create({ userCreateDto: { ...req.user } });
    }

    this.setRefreshToken({ user, res });
  }

  async logout({ headers }: IAuthServiceLogout): Promise<string> {
    const accessToken = headers.authorization.replace('Bearer ', '');
    const refreshToken = headers.cookie.replace('refreshToken=', '');

    try {
      jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
      jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY);
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    const tokenEXP = this.tokenEXP({ accessToken, refreshToken });
    const accessTokenEXP = tokenEXP[0];
    const refreshTokenEXP = tokenEXP[1];

    await this.cacheManager.set(`accessToken:${accessToken}`, 'accessToken', {
      ttl: accessTokenEXP,
    });

    await this.cacheManager.set(`refreshToken:${refreshToken}`, 'refreshToken', {
      ttl: refreshTokenEXP,
    });

    return '로그아웃에 성공하였습니다.';
  }

  tokenEXP({ accessToken, refreshToken }: IAuthServiceTokenEXP): number[] {
    const accessDecoded = this.jwtService.decode(accessToken);
    const refreshDecoded = this.jwtService.decode(refreshToken);

    const result = [accessDecoded, refreshDecoded].map((el) => {
      return Math.floor((new Date(el['exp'] * 1000).getTime() - new Date().getTime()) / 1000);
    });

    return result;
  }
}
