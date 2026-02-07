import { HttpException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UploadsService } from "../../uploads/uploads.service";
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class RemoveCategory {
    constructor(private prisma: PrismaService, private uploadsService: UploadsService) { }

    // DELETE CATEGORY
    async remove(id: string) {
        const category = await this.prisma.coursesCategory.findFirst({
            where: { id },
        });
        if (!category) throw new NotFoundException('Kategoriya topilmadi');

        const uploadsDir = path.resolve(process.cwd(), 'images');
        const imageName = path.basename(category.thumbnail);
        const filePath = path.join(uploadsDir, imageName);

        const url = new URL(category.thumbnail);
        const fileKey = url.pathname.substring(1);

        const deleted = await this.uploadsService.deleteFile(fileKey);
        if (!deleted)
            throw new HttpException('Rasmni o‘chirishda xatolik yuz berdi', 500);

        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (err) {
            console.error('Faylni o‘chirishda xatolik:', err.message);
        }

        await this.prisma.coursesCategory.delete({ where: { id } });
        return { message: 'Kategoriya va rasm o‘chirildi' };
    }
}