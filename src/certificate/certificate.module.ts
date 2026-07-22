import { Module } from '@nestjs/common';
import { CertificateService } from './certificate.service';
import { CertificateController } from './certificate.controller';
import { CertificatePdfService } from './certificate-pdf.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [CertificateService, CertificatePdfService, PrismaService],
  controllers: [CertificateController],
})
export class CertificateModule { }
