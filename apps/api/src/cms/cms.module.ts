import { Module } from '@nestjs/common';
import { CmsService } from './cms.service';
import { CmsPublicController } from './cms-public.controller';
import { CmsAdminController } from './cms-admin.controller';

@Module({
  controllers: [CmsPublicController, CmsAdminController],
  providers: [CmsService],
})
export class CmsModule {}
