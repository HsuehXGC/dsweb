import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PublishStatus } from '@prisma/client';
import { CmsService } from './cms.service';
import {
  CreateBlockDto,
  CreatePageDto,
  CreateSectionDto,
  UpdateBlockDto,
  UpdatePageDto,
  UpdateSectionDto,
} from './dto/cms.dto';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';

@ApiTags('cms-admin')
@ApiBearerAuth()
@Controller({ path: 'admin/cms', version: '1' })
export class CmsAdminController {
  constructor(
    private readonly cms: CmsService,
    private readonly audit: AuditService,
  ) {}

  // ---------- pages ----------

  @Get('pages')
  @RequirePermissions('cms.read')
  listPages() {
    return this.cms.listPages();
  }

  @Get('pages/:id')
  @RequirePermissions('cms.read')
  getPage(@Param('id') id: string) {
    return this.cms.getPage(BigInt(id));
  }

  @Post('pages')
  @RequirePermissions('cms.write')
  async createPage(@Body() dto: CreatePageDto, @CurrentUser() user: AuthenticatedUser) {
    const page = await this.cms.createPage({
      slug: dto.slug,
      title: dto.title,
      seoTitle: dto.seo_title,
      seoDesc: dto.seo_desc,
    });
    await this.audit.record({
      userId: user.id,
      action: 'create',
      entity: 'pages',
      entityId: page.uuid,
    });
    return page;
  }

  @Patch('pages/:id')
  @RequirePermissions('cms.write')
  async updatePage(
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const page = await this.cms.updatePage(BigInt(id), {
      title: dto.title,
      status: dto.status as PublishStatus | undefined,
      seoTitle: dto.seo_title,
      seoDesc: dto.seo_desc,
    });
    await this.audit.record({
      userId: user.id,
      action: 'update',
      entity: 'pages',
      entityId: id,
      changes: dto as unknown,
    });
    return page;
  }

  // ---------- sections ----------

  @Post('sections')
  @RequirePermissions('cms.write')
  createSection(@Body() dto: CreateSectionDto) {
    return this.cms.createSection({
      pageId: BigInt(dto.page_id),
      type: dto.type,
      sort: dto.sort,
      config: dto.config,
    });
  }

  @Patch('sections/:id')
  @RequirePermissions('cms.write')
  updateSection(@Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.cms.updateSection(BigInt(id), {
      type: dto.type,
      sort: dto.sort,
      isVisible: dto.is_visible,
      config: dto.config,
    });
  }

  @Delete('sections/:id')
  @RequirePermissions('cms.write')
  deleteSection(@Param('id') id: string) {
    return this.cms.deleteSection(BigInt(id));
  }

  // ---------- blocks ----------

  @Post('blocks')
  @RequirePermissions('cms.write')
  createBlock(@Body() dto: CreateBlockDto) {
    return this.cms.createBlock({
      sectionId: BigInt(dto.section_id),
      type: dto.type,
      sort: dto.sort,
      content: dto.content,
    });
  }

  @Patch('blocks/:id')
  @RequirePermissions('cms.write')
  async updateBlock(
    @Param('id') id: string,
    @Body() dto: UpdateBlockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const block = await this.cms.updateBlock(BigInt(id), {
      type: dto.type,
      sort: dto.sort,
      content: dto.content,
    });
    await this.audit.record({
      userId: user.id,
      action: 'update',
      entity: 'blocks',
      entityId: id,
    });
    return block;
  }

  @Delete('blocks/:id')
  @RequirePermissions('cms.write')
  deleteBlock(@Param('id') id: string) {
    return this.cms.deleteBlock(BigInt(id));
  }
}
