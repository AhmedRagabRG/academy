import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccountRepository } from './account.repository';
import { AuthGuard } from './auth.guard';
import { CookieService } from './cookie.service';
import { PasswordService } from './password.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import { TokenService } from './token.service';
@Module({
  imports: [JwtModule.register({})],
  providers: [
    AccountRepository,
    AuthGuard,
    CookieService,
    PasswordService,
    RefreshTokenRepository,
    TokenService,
  ],
  exports: [
    AccountRepository,
    AuthGuard,
    CookieService,
    PasswordService,
    RefreshTokenRepository,
    TokenService,
  ],
})
export class AuthModule {}
