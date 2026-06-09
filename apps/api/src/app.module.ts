import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { CmsModule } from './cms/cms.module';
import { SettingsModule } from './settings/settings.module';
import { MailModule } from './mail/mail.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { CrmModule } from './crm/crm.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './rbac/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    MailModule,
    AuditModule,
    AuthModule,
    HealthModule,
    UsersModule,
    RolesModule,
    CmsModule,
    SettingsModule,
    AppointmentsModule,
    CrmModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
  ],
  providers: [
    // 全局守卫：先 JWT 鉴权（注入 request.user），再 RBAC 权限校验。
    // @Public() 路由跳过 JWT；无 @RequirePermissions() 的路由跳过 RBAC。
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
