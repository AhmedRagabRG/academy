import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';
@Injectable()
export class PasswordService {
  hash(plaintext: string): Promise<string> {
    return hash(plaintext, {
      type: argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }
  verify(plaintext: string, digest: string): Promise<boolean> {
    return verify(digest, plaintext);
  }
}
