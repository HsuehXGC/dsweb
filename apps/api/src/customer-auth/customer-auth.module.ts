import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerAuthController, MemberController } from './customer.controller';
import { CustomerJwtGuard } from './customer-jwt.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [CustomerAuthController, MemberController],
  providers: [CustomerAuthService, CustomerJwtGuard],
})
export class CustomerAuthModule {}
