import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Plan } from './plan.entity';
import { DataSource, In, Repository } from 'typeorm';
import {
  IPlanServiceCheckEnd,
  IPlanServiceCreate,
  IPlanServiceFindOneWithPlanID,
  IPlanServiceFindWithPartyID,
  IPlanServiceFindWithUserIDAndPartyID,
  IPlanServiceSoftDelete,
} from './plan.interface';
import { Party_UserService } from '../party-user/party-user.service';
import { User_PointService } from '../user-point/user-point.service';
import { User_Location } from '../user-location/user-location.entity';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,

    private readonly partyUserService: Party_UserService,
    private readonly userPointService: User_PointService,
    private readonly dataSource: DataSource,
  ) {}

  findOneWithPlanID({ planID }: IPlanServiceFindOneWithPlanID): Promise<Plan> {
    return this.planRepository.findOne({
      where: { id: planID },
      relations: ['party'],
    });
  }

  findWithPartyID({ partyID }: IPlanServiceFindWithPartyID): Promise<Plan[]> {
    return this.planRepository.find({ where: { party: { id: partyID } } });
  }

  async findWithUserIDAndPartyID({ user }: IPlanServiceFindWithUserIDAndPartyID): Promise<Plan[]> {
    const partyUsers = await this.partyUserService.findAllWithUserID({ userID: user.id });
    const partyIds = partyUsers?.map((el) => el.party.id);

    const plans = await this.planRepository.find({
      where: { party: { id: In(partyIds) } },
    });

    return plans;
  }

  async create({ planCreateDto }: IPlanServiceCreate): Promise<Plan> {
    const { planName, placeName, placeAddress, placeLat, placeLng, date, fine, partyID } =
      planCreateDto;

    const partyUsers = await this.partyUserService.findAllWithPartyID({ partyID });

    await Promise.all(
      partyUsers.map(async (el) => {
        await this.userPointService.checkPoint({ userID: el.user.id, amount: fine });
      }),
    );

    const plan = await this.planRepository.save({
      planName,
      placeName,
      placeAddress,
      placeLat,
      placeLng,
      date,
      fine,
      party: { id: partyID },
    });
    if (!plan) throw new InternalServerErrorException('plan 생성에 실패하였습니다.');

    return plan;
  }

  async checkEnd({ planID }: IPlanServiceCheckEnd): Promise<Plan> {
    const plan = await this.findOneWithPlanID({ planID });
    if (plan.isEnd) throw new BadRequestException('약속 시간이 종료되었습니다.');

    return plan;
  }

  async softDelete({ planSoftDeleteDto }: IPlanServiceSoftDelete): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      await queryRunner.manager.softDelete(User_Location, { planID: planSoftDeleteDto.planID });

      const result = await queryRunner.manager.softDelete(Plan, { id: planSoftDeleteDto.planID });

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return result.affected ? true : false;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw error;
    }
  }
}
