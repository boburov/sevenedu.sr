import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private readonly config: ConfigService) {
    const keyPath = config.get<string>('APPLE_PRIVATE_KEY_PATH')!;
    const privateKey = fs.readFileSync(keyPath, 'utf8');

    super({
      clientID: config.get<string>('APPLE_CLIENT_ID')!,
      teamID: config.get<string>('APPLE_TEAM_ID')!,
      keyID: config.get<string>('APPLE_KEY_ID')!,
      callbackURL: config.get<string>('APPLE_CALLBACK_URL')!,
      privateKey,
      scope: ['name', 'email'],
      passReqToCallback: true,
    });
  }

  async validate(req: any, accessToken: string, refreshToken: string, idToken: any, profile: any, done: any) {
    // IMPORTANT: Apple gives email/name only the first time.
    const user = {
      provider: 'apple',
      providerId: profile?.id, // stable Apple "sub"
      email: profile?.email ?? null,
      name: profile?.name?.firstName ?? null,
      surname: profile?.name?.lastName ?? null,
    };

    done(null, user);
  }
}