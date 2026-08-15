import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangePasswordDto } from '../../../src/modules/identity/profile/dto/change-password.dto';
import { UpdateProfileDto } from '../../../src/modules/identity/profile/dto/profile.dto';

describe('profile DTO contracts', () => {
  it('accepts self-owned profile fields and a file descriptor', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      displayName: 'أحمد محمود',
      phone: '+201000000001',
      expectedVersion: 1,
      avatar: {
        id: 'file',
        fileName: 'avatar.webp',
        mimeType: 'image/webp',
        size: 12,
        url: '/files/avatar.webp',
      },
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('validates phone, name, version, and password confirmation', async () => {
    expect(
      (
        await validate(
          plainToInstance(UpdateProfileDto, {
            displayName: 'x',
            phone: 'bad',
            expectedVersion: 0,
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(
      (
        await validate(
          plainToInstance(ChangePasswordDto, {
            currentPassword: '',
            newPassword: 'StrongPass1!',
            confirmPassword: 'different',
            expectedVersion: 1,
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
});
