import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-naver-v2';

export class JwtNaverStrategy extends PassportStrategy(Strategy, 'naver') {
  constructor() {
    super({
      clientID: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
      callbackURL: 'http://hyeonju.shop/auth/naver',
      scope: ['nickname', 'email', 'profile_image'],
    });
  }

  validate(accessToken: string, refreshToken: string, profile: Profile) {
    return {
      name: profile.nickname,
      email: profile.email,
      password: process.env.SOCIAL_PASSWORD,
      profileUrl: profile.profileImage,
    };
  }
}
