import { Module } from '@nestjs/common';
import { CertificateService } from './certificate.service';
import { CertificateController } from './certificate.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [CertificateService, PrismaService],
  controllers: [CertificateController]
})
export class CertificateModule {}
