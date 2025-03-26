import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
  Get,
  Param,
} from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@Controller('api/attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('quote'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const buffer = file.buffer;

    const filename = file.originalname;

    const imageUrl = await this.attachmentsService.uploadFile(buffer, filename);

    return { imageUrl };
  }

  // @Get()
  // findAll() {
  //   return this.attachmentsService.findAll()
  // }

  @Get()
  findOne(@Res({ passthrough: true }) response: Response) {
    response.redirect(
      'https://trading-solution.nyc3.digitaloceanspaces.com/cde22248-9dd4-4e11-8f16-db8465e44009-Menu%20Semanal%20-%20JULIANA%20GONZALEZ%20FEDERICA.pdf',
    );
  }
}
// async googleAuthRedirect(
//   @Request() req,
//   @Res({ passthrough: true }) response: Response
// ) {
//   const signIn = await this.authService.signInGoogle(req.user)
//   response.cookie('jwt', signIn.accessToken, {
//     httpOnly: true,
//   })
//   response.redirect(this.configService.get('FRONTEND_URL') + '/companies')
// }
