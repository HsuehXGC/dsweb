import { IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString() slug!: string;
  @IsString() name!: string;
  @IsOptional() @IsIn(['one_time', 'subscription']) type?: string;
  @IsNumber() base_price!: number;
  @IsOptional() @IsObject() description?: Record<string, unknown>;
  @IsOptional() @IsObject() specs?: Record<string, unknown>;
}

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() base_price?: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsObject() description?: Record<string, unknown>;
}

export class CreateSkuDto {
  @IsString() code!: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsObject() variant?: Record<string, unknown>;
}
