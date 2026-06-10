import { Module } from '@nestjs/common';
import { CmsService } from './cms.service';
import { CmsPublicController, PostsPublicController } from './cms-public.controller';
import { CmsAdminController } from './cms-admin.controller';

@Module({
  controllers: [CmsPublicController, PostsPublicController, CmsAdminController],
  providers: [CmsService],
})
export class CmsModule {}
