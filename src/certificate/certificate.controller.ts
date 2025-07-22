import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { CertificateService } from './certificate.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';

@Controller('certificate')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) { }

  @Post('submit')
  async submitCertificate(@Body() dto: CreateCertificateDto) {
    return this.certificateService.submitCertificate(dto);
  }

  @Get('generate-test')
  async generateTest(@Query('userId') userId: string, @Query('courseId') courseId: string) {
    return this.certificateService.generateCertificateTest(userId, courseId);
  }

}