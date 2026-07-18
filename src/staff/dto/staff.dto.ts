import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum AdminRoleDto {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
}

export class CreateStaffDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  surname?: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(AdminRoleDto)
  role?: AdminRoleDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  surname?: string;

  @IsOptional()
  @IsEnum(AdminRoleDto)
  role?: AdminRoleDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateStaffPasswordDto {
  @IsString()
  @MinLength(6)
  password: string;
}
