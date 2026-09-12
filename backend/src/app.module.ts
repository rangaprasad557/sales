import { Module, Controller, Get } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { CategoriesModule } from './modules/categories/categories.module';
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
  imports: [
    AuthModule,
    UsersModule,
    CustomersModule,
    SuppliersModule,
    CategoriesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
