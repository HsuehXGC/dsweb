import { IsBoolean, IsInt, IsObject, IsOptional, IsString } from 'class-validator';
import { PublishStatus } from '@prisma/client';

export class CreatePageDto {
  @IsString() slug!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() seo_title?: string;
  @IsOptional() @IsString() seo_desc?: string;
}

export class UpdatePageDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() status?: PublishStatus;
  @IsOptional() @IsString() seo_title?: string;
  @IsOptional() @IsString() seo_desc?: string;
}

export class CreateSectionDto {
  @IsString() page_id!: string;
  @IsString() type!: string;
  @IsOptional() @IsInt() sort?: number;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}

export class UpdateSectionDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsInt() sort?: number;
  @IsOptional() @IsBoolean() is_visible?: boolean;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}

export class CreateBlockDto {
  @IsString() section_id!: string;
  @IsString() type!: string;
  @IsOptional() @IsInt() sort?: number;
  @IsObject() content!: Record<string, unknown>;
}

export class UpdateBlockDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsInt() sort?: number;
  @IsOptional() @IsObject() content?: Record<string, unknown>;
}
