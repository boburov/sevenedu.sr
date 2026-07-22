import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CertificateService } from './certificate.service';
import { SubmitCertificateTestDto } from './dto/submit-certificate-test.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('certificate')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) { }

  /** Foydalanuvchining barcha sertifikatlari (profil → «Sertifikatlarim»). */
  @Get('my')
  async myCertificates(@Req() req) {
    return this.certificateService.listForUser(req.user.id);
  }

  /** Kurs bo'yicha holat: darslar tugadimi, sertifikat berilganmi. */
  @Get('course/:courseId/status')
  async courseStatus(@Req() req, @Param('courseId') courseId: string) {
    return this.certificateService.getCourseStatus(req.user.id, courseId);
  }

  /** Yakuniy test savollari (to'g'ri javoblarsiz). */
  @Get('course/:courseId/test')
  async generateTest(@Req() req, @Param('courseId') courseId: string) {
    return this.certificateService.generateCertificateTest(req.user.id, courseId);
  }

  /** Test javoblarini yuborish — ball yetsa sertifikat beriladi. */
  @Post('course/:courseId/submit')
  async submitTest(
    @Req() req,
    @Param('courseId') courseId: string,
    @Body() dto: SubmitCertificateTestDto,
  ) {
    return this.certificateService.submitCertificateTest(req.user.id, courseId, dto);
  }

  /** Sertifikat PDF si. Har safar shablondan qayta chiziladi — diskda saqlanmaydi. */
  @Get(':id/pdf')
  async downloadPdf(@Req() req, @Param('id') id: string, @Res() res: Response) {
    const { pdf, filename } = await this.certificateService.renderPdf(req.user.id, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': String(pdf.length),
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Shaxsiy hujjat — faqat foydalanuvchining o'z qurilmasida keshlansin.
      'Cache-Control': 'private, max-age=86400',
    });
    res.end(Buffer.from(pdf));
  }
}
