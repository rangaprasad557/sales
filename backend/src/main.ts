import { NestFactory } from '@nestjs/core';
import { Module, Get, Controller } from '@nestjs/common';
import { checkDatabaseConnection } from './db/connection';

@Controller('health')
class HealthController {
  @Get()
  async getHealth() {
    const dbOk = await checkDatabaseConnection();
    return {
      status: 'ok',
      service: 'sales-modular-monolith',
      timestamp: new Date().toISOString(),
      database: dbOk ? 'healthy' : 'disconnected',
    };
  }
}

@Module({
  controllers: [HealthController],
})
export class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Sales Modular Monolith API capability layer running on port ${port}`);
}

if (require.main === module) {
  bootstrap();
}
