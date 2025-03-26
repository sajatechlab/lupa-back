import { Injectable, NotFoundException } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class AttachmentsService {
  private s3: AWS.S3;
  constructor(private configService: ConfigService) {
    this.s3 = new AWS.S3({
      endpoint: this.configService.get('SPACES_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
      region: 'nyc3',
    });
  }
  async uploadFile(buffer: Buffer, filename: string): Promise<string> {
    const params = {
      Bucket: this.configService.get('SPACES_BUCKET_NAME'),
      Key: filename,
      Body: buffer,
      ACL: 'public-read',
    };

    const { Location } = await this.s3.upload(params).promise();

    return Location;
  }

  async downloadFile(filename: string): Promise<{
    buffer: Buffer;
    contentType: string;
  }> {
    try {
      const params = {
        Bucket: this.configService.get('SPACES_BUCKET_NAME'),
        Key: filename,
      };
      console.log('params', filename);

      const file = await this.s3.getObject(params).promise();

      return {
        buffer: file.Body as Buffer,
        contentType: file.ContentType || 'application/octet-stream',
      };
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        throw new NotFoundException('File not found');
      }
      throw error;
    }
  }
}
