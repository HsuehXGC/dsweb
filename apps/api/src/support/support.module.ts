import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportAdminController, SupportPublicController } from './support.controller';

@Module({
  controllers: [SupportPublicController, SupportAdminController],
  providers: [SupportService],
})
export class SupportModule {}
