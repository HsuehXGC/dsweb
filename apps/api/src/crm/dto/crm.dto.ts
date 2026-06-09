import {
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateLeadDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() assigned_to_id?: string | null;
  @IsOptional() @IsInt() score?: number;
  @IsOptional() @IsString() lost_reason?: string;
}

export class CreateCustomerDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() first_name?: string;
  @IsOptional() @IsString() last_name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsIn(['en', 'zh']) locale?: string;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() first_name?: string;
  @IsOptional() @IsString() last_name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsInt() vip_level?: number;
}

export class CreatePropertyDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() zip?: string;
  @IsOptional() @IsNumber() acres?: number;
  @IsOptional() @IsString() slope?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateDealDto {
  @IsString() customer_id!: string;
  @IsString() title!: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsString() stage?: string;
}

export class UpdateDealDto {
  @IsOptional() @IsString() stage?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsNumber() amount?: number;
}

export class CreateActivityDto {
  @IsString() customer_id!: string;
  @IsIn(['call', 'email', 'meeting', 'note']) type!: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() body?: string;
}
