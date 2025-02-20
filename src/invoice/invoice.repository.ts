import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class InvoiceRepository {
  constructor(private prisma: PrismaService) {}

  //   async findByUuid(uuid: string) {
  //     return this.prisma.invoice.findUnique({
  //       where: { uuid },
  //     });
  //   }

  //   async create(data: any) {
  //     return this.prisma.invoice.create({
  //       data,
  //     });
  //   }

  async findAll(type?: 'SENT' | 'RECEIVED') {
    return this.prisma.invoice.findMany({
      where: { type },
      include: {
        thirdParty: true,
        company: true,
        lines: true,
      },
    });
  }
}
