import { Body, Controller, Delete, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PlanService } from './plan.service';
import { Plan } from './plan.entity';
import { PlanCreateDto, PlanSoftDeleteDto } from './plan.dto';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { JwtReqUser } from '../../commons/interface/req.interface';

@ApiTags('Plan')
@Controller('/plan')
export class PlanController {
  constructor(
    private readonly planService: PlanService, //
  ) {}

  @ApiOperation({
    summary: '하나의 plan 가져오기',
    description: 'planID에 해당하는 plan을 가져온다.',
  })
  @ApiQuery({ name: 'planID', description: '찾고 싶은 plan의 id' })
  @UseGuards(AuthGuard('access'))
  @Get('/planFindOneWithPlanID')
  planFindOneWithPlanID(
    @Query('planID') planID: string, //
  ): Promise<Plan> {
    return this.planService.findOneWithPlanID({ planID });
  }

  @ApiOperation({
    summary: '해당 party의 모든 plan 가져오기',
    description: 'partyID의 모든 plan을 가져온다.',
  })
  @ApiQuery({ name: 'partyID', description: '찾고 싶은 party의 id' })
  @UseGuards(AuthGuard('access'))
  @Get('/planFindWithPartyID')
  planFindWithPartyID(
    @Query('partyID') partyID: string, //
  ): Promise<Plan[]> {
    return this.planService.findWithPartyID({ partyID });
  }

  @ApiOperation({
    summary: '로그인 user의 모든 plan 가져오기',
    description: '로그인 user의 모든 plan을 가져온다.',
  })
  @UseGuards(AuthGuard('access'))
  @Get('/planFindWithUserIDAndPartyID')
  planFindWithUserIDAndPartyID(
    @Req() req: Request & JwtReqUser, //
  ): Promise<Plan[]> {
    return this.planService.findWithUserIDAndPartyID({ user: req.user });
  }

  @ApiOperation({
    summary: 'plan 생성하기',
    description: 'plan을 생성하여 DB에 저장한다.',
  })
  @UseGuards(AuthGuard('access'))
  @Post('/planCreate')
  planCreate(
    @Body() planCreateDto: PlanCreateDto, //
  ): Promise<Plan> {
    return this.planService.create({ planCreateDto });
  }

  @ApiOperation({
    summary: '약속 소프트 삭제',
    description: '약속을 소프트 삭제한다.',
  })
  @UseGuards(AuthGuard('access'))
  @Delete('/planSoftDelete')
  planSoftDelete(
    @Body() planSoftDeleteDto: PlanSoftDeleteDto, //
  ): Promise<boolean> {
    return this.planService.softDelete({ planSoftDeleteDto });
  }
}
