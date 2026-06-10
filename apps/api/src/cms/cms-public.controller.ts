import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { Public } from '../auth/public.decorator';

@ApiTags('cms-public')
@Controller({ path: 'public/pages', version: '1' })
export class CmsPublicController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: '按 slug 获取已发布页面（含 section/block），供客户端渲染' })
  getPage(@Param('slug') slug: string) {
    return this.cms.getPublicPage(slug);
  }
}

@ApiTags('cms-public')
@Controller({ path: 'public/posts', version: '1' })
export class PostsPublicController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '博客文章列表（已发布）' })
  list(@Query('category') category?: string) {
    return this.cms.listPublicPosts(category);
  }

  @Public()
  @Get(':slug')
  getPost(@Param('slug') slug: string) {
    return this.cms.getPublicPost(slug);
  }
}
