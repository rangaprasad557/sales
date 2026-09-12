import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getAnalytics(
    @Query('granularity') granularity?: string,
    @Query('from_date') fromDateSnake?: string,
    @Query('fromDate') fromDateCamel?: string,
    @Query('to_date') toDateSnake?: string,
    @Query('toDate') toDateCamel?: string,
  ) {
    const query: AnalyticsQueryDto = {
      granularity,
      from_date: fromDateSnake || fromDateCamel,
      to_date: toDateSnake || toDateCamel,
    };

    return await this.analyticsService.getAnalytics(query);
  }
}
