import { Module, forwardRef } from '@nestjs/common';
import { FriendController } from './friend.controller';
import { FriendService } from './friend.service';
import { Friend } from './friend.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    TypeOrmModule.forFeature([
      Friend, //
    ]),
  ],
  controllers: [
    FriendController, //
  ],
  providers: [
    FriendService, //
  ],
  exports: [
    FriendService, //
  ],
})
export class FriendModule {}
