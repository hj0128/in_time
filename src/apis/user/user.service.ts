import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  InternalServerErrorException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { DataSource, In, Repository } from 'typeorm';
import {
  IUserServiceCreate,
  IUserServiceDelete,
  IUserServiceFindAllWithUserID,
  IUserServiceFindOneWithEmail,
  IUserServiceFindOneWithName,
  IUserServiceFindOneWithUserID,
  IUserServiceSendEmail,
  IUserServiceSoftDelete,
} from './user.interface';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { AuthService } from '../auth/auth.service';
import { Friend } from '../friend/friend.entity';
import { Party_UserService } from '../party-user/party-user.service';
import { Party_User } from '../party-user/party-user.entity';
import { User_Point } from '../user-point/user-point.entity';
import { User_Location } from '../user-location/user-location.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>, //

    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,

    private readonly dataSource: DataSource,
    private readonly partyUserService: Party_UserService,
  ) {}

  findOneWithUserID({ id }: IUserServiceFindOneWithUserID): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  findAllWithUserID({ usersID }: IUserServiceFindAllWithUserID): Promise<User[]> {
    return this.userRepository.find({ where: { id: In(usersID) } });
  }

  async findOneWithName({ name }: IUserServiceFindOneWithName): Promise<User> {
    const users = await this.userRepository.find({ where: { name }, withDeleted: true });

    return users[0];
  }

  async findOneWithEmail({ email }: IUserServiceFindOneWithEmail): Promise<User> {
    const users = await this.userRepository.find({ where: { email }, withDeleted: true });

    return users[0];
  }

  async sendEmail({ name, email, userEmail }: IUserServiceSendEmail): Promise<void> {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.NODE_MAIL_GMAIL_EMAIL,
        pass: process.env.NODE_MAIL_GMAIL_PASSWORD,
      },
    });

    const html = `
      <div style="max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
        <h1 style="color: #333;">In_Time 회원가입을 축하합니다!</h1>
        <p style="color: #555; font-size: 16px;">안녕하세요 ${name}님 In_Time에 가입해 주셔서 감사합니다.</p>
        <p style="color: #555; font-size: 16px;">${name}님의 이메일은 ${email}입니다.</p>
        <p style="color: #555; font-size: 16px;">이제 In_Time의 다양한 서비스를 자유롭게 이용하실 수 있습니다.</p>
        <p style="color: #555; font-size: 16px;">추가적인 정보나 도움이 필요하시면 언제든지 문의해 주세요.</p>
        <p style="color: #555; font-size: 16px;">감사합니다!<br><br>In_Time 팀 드림</p>    
      </div>
    `;

    transporter.sendMail({
      from: process.env.NODE_MAIL_GMAIL_EMAIL,
      to: userEmail,
      subject: 'In_Time 회원가입을 축하합니다!.',
      html,
    });
  }

  async create({ userCreateDto }: IUserServiceCreate): Promise<User> {
    const { email, name, password, profileUrl, userEmail } = userCreateDto;

    const emailRegex = /[^a-zA-Z0-9가-힣@.]/g;
    const nameRegex = /[^a-zA-Z0-9가-힣]/g;
    const _email = email.replace(emailRegex, '');
    let _name = name.replace(nameRegex, '');

    if (!_name) {
      const randomNumber = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      _name = `name${randomNumber}`;
    }

    const duplicateNameUser = await this.findOneWithName({ name: _name });
    const duplicateEmailUser = await this.findOneWithEmail({ email: _email });
    if (duplicateNameUser || duplicateEmailUser) {
      throw new ConflictException('이메일 또는 별명이 중복되어 사용이 불가합니다.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const create = await this.userRepository.save({
      name: _name,
      email: _email,
      password: hashedPassword,
      profileUrl,
    });

    if (!create) throw new InternalServerErrorException('회원 생성에 실패하였습니다.');

    await this.sendEmail({ name: _name, email: _email, userEmail });

    return create;
  }

  async softDelete({ userID, headers }: IUserServiceSoftDelete): Promise<boolean> {
    const user = await this.findOneWithUserID({ id: userID });
    if (user.deletedAt) throw new GoneException('이미 탈퇴한 사용자입니다.');
    if (user.point > 0) throw new ForbiddenException('포인트를 모두 출금한 후 탈퇴해 주세요.');

    await this.partyUserService.checkPartyMembers({ userID });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      await queryRunner.manager.softDelete(User_Point, { user: { id: userID } });
      await queryRunner.manager.softDelete(Friend, { user: { id: userID } });
      await queryRunner.manager.softDelete(Friend, { toUserID: userID });
      await queryRunner.manager.softDelete(Party_User, { user: { id: userID } });
      await queryRunner.manager.softDelete(User_Location, { user: { id: userID } });

      const result = await queryRunner.manager.softDelete(User, { id: userID });

      await this.authService.logout({ headers });

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return result.affected ? true : false;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw error;
    }
  }

  async delete({ userDeleteDto }: IUserServiceDelete): Promise<boolean> {
    const result = await this.userRepository.delete({ id: userDeleteDto.userID });

    return result.affected ? true : false;
  }
}
