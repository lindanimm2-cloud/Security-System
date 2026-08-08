import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class EmergencyContactDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  relationship!: string;
}

export class MedicalProfileDto {
  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  medications?: string;

  @IsOptional()
  @IsString()
  emergencyNotes?: string;
}

export class ClientRegisterDto {
  @IsString()
  @IsNotEmpty()
  tenantSlug!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  /** store = website shopper; protection = full client (default) */
  @IsOptional()
  @IsIn(['store', 'protection'])
  accountKind?: 'store' | 'protection';

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MedicalProfileDto)
  medical?: MedicalProfileDto;

  @IsBoolean()
  @Equals(true, { message: 'You must accept the terms to register' })
  acceptTerms!: boolean;
}

export class ClientRegisterCompleteDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MedicalProfileDto)
  medical?: MedicalProfileDto;

  @IsBoolean()
  @Equals(true, { message: 'You must accept the terms to register' })
  acceptTerms!: boolean;
}

export class ClientOAuthDto {
  @IsIn(['google', 'apple'])
  provider!: 'google' | 'apple';

  @IsString()
  @IsNotEmpty()
  tenantSlug!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['store', 'protection'])
  accountKind?: 'store' | 'protection';

  @IsBoolean()
  @Equals(true, { message: 'You must accept the terms to continue' })
  acceptTerms!: boolean;
}
