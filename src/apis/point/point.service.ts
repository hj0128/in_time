import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { POINT_STATUS, Point } from './point.entity';
import { DataSource, Repository } from 'typeorm';
import {
  IPointServiceCheckDuplication,
  IPointServiceEmpty,
  IPointServiceFill,
  IPointServiceFindOneWithImpUid,
  IPointServiceFindWithUserID,
} from './point.interface';
import { User } from '../user/user.entity';
import { IamPortService } from '../iam-port/iam-port.service';

@Injectable()
export class PointService {
  constructor(
    @InjectRepository(Point)
    private readonly pointRepository: Repository<Point>,

    private readonly dataSource: DataSource,
    private readonly iamPortService: IamPortService,
  ) {}

  findWithUserID({ userID }: IPointServiceFindWithUserID): Promise<Point[]> {
    return this.pointRepository.find({ where: { user: { id: userID } } });
  }

  findOneWithImpUid({ impUid }: IPointServiceFindOneWithImpUid): Promise<Point> {
    return this.pointRepository.findOne({ where: { impUid } });
  }

  async checkDuplication({ impUid }: IPointServiceCheckDuplication): Promise<void> {
    const point = await this.findOneWithImpUid({ impUid });
    if (point) throw new ConflictException('이미 처리된 결제 아이디입니다.');
  }

  async fill({ user: _user, pointFillDto }: IPointServiceFill): Promise<Point> {
    const { impUid, amount } = pointFillDto;

    await this.iamPortService.checkPaid({ impUid, amount });

    await this.checkDuplication({ impUid });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const point = await queryRunner.manager.save(Point, {
        impUid,
        amount,
        status: POINT_STATUS.POINT_FILL,
        user: _user,
      });

      const id = _user.id;
      await queryRunner.manager.increment(User, { id }, 'point', amount);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return point;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();

      throw error;
    }
  }

  async send({ user: _user, pointSendDto }: IPointServiceEmpty) {
    const { amount } = pointSendDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const id = _user.id;

      const user = await queryRunner.manager.findOne(User, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (user.point < amount) {
        throw new UnprocessableEntityException('보유한 포인트보다 많은 금액을 보낼 수 없습니다.');
      }

      const point = await queryRunner.manager.save(Point, {
        impUid: 'imp_send',
        amount: -amount,
        status: POINT_STATUS.POINT_SEND,
        user: _user,
      });

      await queryRunner.manager.increment(User, { id }, 'point', -amount);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return point;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();

      throw error;
    }
  }
}