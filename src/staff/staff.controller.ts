import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { AdminAuthGuard } from '../guard/admin-auth.guard';
import { OwnerGuard } from '../guard/owner.guard';
import {
  CreateStaffDto,
  UpdateStaffDto,
  UpdateStaffPasswordDto,
} from './dto/staff.dto';

// Barcha staff endpointlari faqat OWNER uchun.
@Controller('staff')
@UseGuards(AdminAuthGuard, OwnerGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  // Frontend ruxsat matritsasi uchun katalog (OWNER'ga ochiq)
  @Get('permissions-catalog')
  catalog() {
    return this.staffService.permissionsCatalog();
  }

  @Get()
  findAll() {
    return this.staffService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateStaffDto) {
    return this.staffService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto, @Req() req) {
    return this.staffService.update(id, dto, req.user.id);
  }

  @Patch(':id/password')
  updatePassword(
    @Param('id') id: string,
    @Body() dto: UpdateStaffPasswordDto,
  ) {
    return this.staffService.updatePassword(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.staffService.remove(id, req.user.id);
  }
}
