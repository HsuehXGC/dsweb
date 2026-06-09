import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsObject, IsOptional, IsString } from 'class-validator';
import { SupportService } from './support.service';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

class ContactDto {
  @IsString() subject!: string;
  @IsString() body!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() name?: string;
}
class ReplyDto {
  @IsString() body!: string;
  @IsOptional() @IsBoolean() internal?: boolean;
}
class UpdateTicketDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() assigned_to_id?: string | null;
}
class CreateKbDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsBoolean() is_public?: boolean;
  @IsObject() question!: Record<string, unknown>;
  @IsObject() answer!: Record<string, unknown>;
}

@ApiTags('support-public')
@Controller({ path: 'public', version: '1' })
export class SupportPublicController {
  constructor(private readonly support: SupportService) {}

  @Public()
  @Post('support/contact')
  contact(@Body() dto: ContactDto) {
    return this.support.createTicket({ subject: dto.subject, body: dto.body, email: dto.email, name: dto.name });
  }

  @Public()
  @Get('kb')
  kb(@Query('category') category?: string) {
    return this.support.listPublicKb(category);
  }
}

@ApiTags('support-admin')
@ApiBearerAuth()
@Controller({ path: 'admin/support', version: '1' })
export class SupportAdminController {
  constructor(private readonly support: SupportService) {}

  @Get('tickets')
  @RequirePermissions('support_tickets.read')
  list(@Query('status') status?: string, @Query('assigned_to_id') assignedToId?: string) {
    return this.support.listTickets({ status, assignedToId });
  }

  @Get('tickets/:id')
  @RequirePermissions('support_tickets.read')
  get(@Param('id') id: string) {
    return this.support.getTicket(BigInt(id));
  }

  @Post('tickets/:id/reply')
  @RequirePermissions('support_tickets.write')
  reply(@Param('id') id: string, @Body() dto: ReplyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.support.reply(BigInt(id), dto.body, user.id, dto.internal ?? false);
  }

  @Patch('tickets/:id')
  @RequirePermissions('support_tickets.write')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.support.update(BigInt(id), {
      status: dto.status,
      priority: dto.priority,
      assignedToId: dto.assigned_to_id,
    });
  }

  @Get('kb')
  @RequirePermissions('support_tickets.read')
  listKb() {
    return this.support.listKb();
  }

  @Post('kb')
  @RequirePermissions('support_tickets.write')
  createKb(@Body() dto: CreateKbDto) {
    return this.support.createKb({
      category: dto.category,
      isPublic: dto.is_public,
      question: dto.question,
      answer: dto.answer,
    });
  }
}
