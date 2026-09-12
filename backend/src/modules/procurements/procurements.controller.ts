import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ProcurementsService } from './procurements.service';
import { CreateProcurementDto } from './dto/create-procurement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('procurements')
export class ProcurementsController {
  constructor(private readonly procurementsService: ProcurementsService) {}

  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.procurementsService.findAll(
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
    return {
      status: 'success',
      count: data.length,
      data,
    };
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.procurementsService.findById(id);
    return {
      status: 'success',
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateProcurementDto) {
    const data = await this.procurementsService.create(dto);
    return {
      status: 'success',
      message: 'Procurement recorded and inventory lots generated successfully',
      data,
    };
  }
}
