import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CommerceService } from './commerce.service';
import { Public } from '../auth/public.decorator';

class CheckoutItemDto {
  @IsString() sku_code!: string;
  @IsInt() @Min(1) quantity!: number;
}

class CheckoutCustomerDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() first_name?: string;
  @IsOptional() @IsString() last_name?: string;
  @IsOptional() @IsString() phone?: string;
}

class QuoteDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];
  @IsOptional() @IsString() discount_code?: string;
}

class CheckoutDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @ValidateNested() @Type(() => CheckoutCustomerDto)
  customer!: CheckoutCustomerDto;

  @IsString() payment_token!: string;
  @IsOptional() @IsObject() shipping_address?: Record<string, unknown>;
  @IsOptional() @IsObject() billing_address?: Record<string, unknown>;
  @IsOptional() @IsString() discount_code?: string;
  @IsOptional() @IsIn(['en', 'zh']) locale?: 'en' | 'zh';
}

@ApiTags('commerce')
@Controller({ path: 'public', version: '1' })
export class CommerceController {
  constructor(private readonly commerce: CommerceService) {}

  @Public()
  @Post('checkout/quote')
  @ApiOperation({ summary: '结账询价（计算税费/运费/折扣/合计）' })
  quote(@Body() dto: QuoteDto) {
    return this.commerce.quote(dto.items, dto.discount_code);
  }

  @Public()
  @Post('checkout')
  @ApiOperation({ summary: '结账下单（建单→扣款→扣库存→确认邮件）' })
  checkout(@Body() dto: CheckoutDto) {
    return this.commerce.checkout(dto);
  }
}
