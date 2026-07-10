import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { HouseModel } from '../../generated/prisma/models';
import type { AuthenticatedRequest } from '../auth/session.guard';
import { HouseInput, HousesService } from './houses.service';

export interface HouseDto {
  id: number;
  name: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

// BigInt ids don't survive JSON.stringify — expose them as numbers
function toHouseDto(house: HouseModel): HouseDto {
  return {
    id: Number(house.id),
    name: house.name,
    note: house.note,
    createdAt: house.createdAt.toISOString(),
    updatedAt: house.updatedAt.toISOString(),
  };
}

// No @Public() anywhere: the global SessionGuard applies, and every service
// call is scoped to req.user.id (FR-ACCESS-01, NFR-SEC-03).
@Controller('houses')
export class HousesController {
  constructor(private readonly houses: HousesService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest): Promise<HouseDto[]> {
    const houses = await this.houses.list(req.user.id);
    return houses.map(toHouseDto);
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: HouseInput,
  ): Promise<HouseDto> {
    return toHouseDto(await this.houses.create(req.user.id, body));
  }

  @Get(':id')
  async get(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<HouseDto> {
    return toHouseDto(await this.houses.get(req.user.id, id));
  }

  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: HouseInput,
  ): Promise<HouseDto> {
    return toHouseDto(await this.houses.update(req.user.id, id, body));
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    await this.houses.remove(req.user.id, id);
    return { ok: true };
  }
}
