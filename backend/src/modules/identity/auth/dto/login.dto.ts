import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class LoginDto {
  @ApiProperty({ example: 'employee@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;
  @ApiProperty({ example: 'كلمة مرور آمنة' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  password!: string;
}
