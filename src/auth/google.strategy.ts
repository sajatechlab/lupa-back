// import { PassportStrategy } from '@nestjs/passport';
// import { Strategy, VerifyCallback } from 'passport-google-oauth20';
// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// @Injectable()
// export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
//   constructor(private configService: ConfigService) {
//     super({
//       clientID: configService.get('GOOGLE_CLIENT_ID'),
//       clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
//       callbackURL: `${configService.get('BACK_URL')}/api/auth/google-redirect`,
//       //callbackURL: `http://localhost:8080/api/auth/google-redirect`,

//       scope: ['email', 'profile'],
//     })
//   }
//   async validate(
//     _accessToken: string,
//     _refreshToken: string,
//     profile: any,
//     done: VerifyCallback
//   ): Promise<any> {
//     const {
//       name,
//       emails,
//       photos,
//       _json: { hd },
//     } = profile
//     // if (!hd || hd !== 'tradingsol.com') {
//     //   done(new UnauthorizedException('You need an authorize email'))
//     // }
//     const user = {
//       email: emails[0].value,
//       first_name: name.givenName,
//       last_name: name.familyName,
//       password: '',
//     }
//     done(null, user)
//   }
// }
