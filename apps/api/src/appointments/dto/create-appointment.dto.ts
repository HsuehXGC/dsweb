import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AddressDto {
  @IsString() @IsNotEmpty() street!: string;
  @IsString() @IsNotEmpty() city!: string;
  @IsString() @IsNotEmpty() state!: string;
  @IsString() @IsNotEmpty() zip!: string;
}

/** POST /api/v1/public/appointments —— 对应需求文档 C2 */
export class CreateAppointmentDto {
  @IsIn(['standard', 'demo_day', 'same_day'])
  type!: 'standard' | 'demo_day' | 'same_day';

  @IsString() @IsNotEmpty() first_name!: string;
  @IsString() @IsNotEmpty() last_name!: string;
  @IsEmail() email!: string;
  @IsString() @IsNotEmpty() phone!: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @IsOptional() @IsNumber() property_acres?: number;

  @IsOptional() @IsIn(['flat', 'gentle', 'moderate', 'steep'])
  slope?: 'flat' | 'gentle' | 'moderate' | 'steep';

  @IsOptional() @IsIn(['yes', 'no', 'unknown'])
  wifi_status?: 'yes' | 'no' | 'unknown';

  @IsOptional() @IsString() preferred_date?: string; // ISO8601
  @IsOptional() @IsString() preferred_town?: string; // same_day 用
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsIn(['en', 'zh']) locale?: 'en' | 'zh';
}
