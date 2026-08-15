import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidationException } from '../../../core/exceptions';

@Injectable()
export class PasswordPolicyService {
  constructor(private readonly config: ConfigService) {}
  validate(password: string): void {
    const minLength = this.config.get<number>('passwordPolicy.minLength', 12);
    const valid =
      password.length >= minLength &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password);
    if (!valid)
      throw new ValidationException([
        {
          field: 'password',
          message: `يجب أن تتكون كلمة المرور من ${minLength} حرفاً وتحتوي على أحرف كبيرة وصغيرة ورقم ورمز`,
        },
      ]);
  }
}
