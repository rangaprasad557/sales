import { Module, Controller, Get } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { checkDatabaseConnection } from './db/connection';

@Controller('health')
export class HealthController {
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
  imports: [AuthModule, UsersModule],
  controllers: [HealthController],
})
export class AppModule {}
