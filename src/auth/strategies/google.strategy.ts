// src/auth/strategies/google.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(private readonly config: ConfigService) {
        super({
            clientID: config.get<string>('GOOGLE_CLIENT_ID')!,
            clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET')!,
            callbackURL: config.get<string>('GOOGLE_CALLBACK_URL')!,
            scope: ['email', 'profile'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ) {
        const email = profile?.emails?.[0]?.value ?? null;

        const user = {
            provider: 'google',
            providerId: profile?.id,
            email,
            firstName: profile?.name?.givenName,
            lastName: profile?.name?.familyName,
            photo: profile?.photos?.[0]?.value,
        };

        done(null, user);
    }
}