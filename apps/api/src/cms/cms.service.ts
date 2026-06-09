import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PublishStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- 公开（客户端）----------

  /** 按 slug 取已发布页面，含可见 section 及其 block（均按 sort 排序） */
  async getPublicPage(slug: string) {
    const page = await this.prisma.page.findFirst({
      where: { slug, status: PublishStatus.published, deletedAt: null },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { sort: 'asc' },
          include: { blocks: { orderBy: { sort: 'asc' } } },
        },
      },
    });
    if (!page) {
      throw new NotFoundException(`Page not found: ${slug}`);
    }
    return {
      slug: page.slug,
      title: page.title,
      seo: { title: page.seoTitle, description: page.seoDesc },
      sections: page.sections.map((s) => ({
        type: s.type,
        config: s.config ?? {},
        blocks: s.blocks.map((b) => ({ type: b.type, content: b.content })),
      })),
    };
  }

  // ---------- 后台 ----------

  listPages() {
    return this.prisma.page.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        uuid: true,
        slug: true,
        title: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
  }

  async getPage(id: bigint) {
    const page = await this.prisma.page.findFirst({
      where: { id, deletedAt: null },
      include: {
        sections: {
          orderBy: { sort: 'asc' },
          include: { blocks: { orderBy: { sort: 'asc' } } },
        },
      },
    });
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }

  createPage(data: {
    slug: string;
    title: string;
    seoTitle?: string;
    seoDesc?: string;
  }) {
    return this.prisma.page.create({ data });
  }

  async updatePage(
    id: bigint,
    data: { title?: string; status?: PublishStatus; seoTitle?: string; seoDesc?: string },
  ) {
    await this.ensurePage(id);
    return this.prisma.page.update({
      where: { id },
      data: {
        ...data,
        publishedAt:
          data.status === PublishStatus.published ? new Date() : undefined,
      },
    });
  }

  createSection(data: {
    pageId: bigint;
    type: string;
    sort?: number;
    config?: Record<string, unknown>;
  }) {
    return this.prisma.section.create({
      data: { ...data, config: (data.config ?? {}) as Prisma.InputJsonValue },
    });
  }

  async updateSection(
    id: bigint,
    data: { type?: string; sort?: number; isVisible?: boolean; config?: Record<string, unknown> },
  ) {
    return this.prisma.section.update({
      where: { id },
      data: { ...data, config: data.config as Prisma.InputJsonValue | undefined },
    });
  }

  deleteSection(id: bigint) {
    return this.prisma.section.delete({ where: { id } });
  }

  createBlock(data: {
    sectionId: bigint;
    type: string;
    sort?: number;
    content: Record<string, unknown>;
  }) {
    return this.prisma.block.create({
      data: { ...data, content: data.content as Prisma.InputJsonValue },
    });
  }

  updateBlock(
    id: bigint,
    data: { type?: string; sort?: number; content?: Record<string, unknown> },
  ) {
    return this.prisma.block.update({
      where: { id },
      data: { ...data, content: data.content as Prisma.InputJsonValue | undefined },
    });
  }

  deleteBlock(id: bigint) {
    return this.prisma.block.delete({ where: { id } });
  }

  private async ensurePage(id: bigint) {
    const exists = await this.prisma.page.findFirst({ where: { id, deletedAt: null } });
    if (!exists) {
      throw new NotFoundException('Page not found');
    }
  }
}
