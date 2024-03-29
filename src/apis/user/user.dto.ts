import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UserCreateDto {
  @ApiProperty({ example: '철수', description: '별명' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'a@a.com', description: '이메일 주소' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '1234', description: '비밀번호' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'https://dog.jpg', description: '프로필 사진 주소' })
  @IsString()
  @IsNotEmpty()
  profileUrl: string;

  @ApiProperty({ example: 'a@gmail.com', description: 'user의 실 이메일 주소' })
  @IsEmail()
  @IsNotEmpty()
  userEmail: string;
}

export class UserDeleteDto {
  @ApiProperty({ example: 'User01', description: 'user의 id' })
  @IsString()
  @IsNotEmpty()
  userID: string;
}
