import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface VimeoDownloadInfo {
  url: string; // to'g'ridan-to'g'ri yuklab olinadigan progressive MP4 URL (signed, qisqa muddatli)
  sizeBytes: number | null;
  quality: string | null; // masalan "720p"
  durationSec: number | null;
  expiresAt: Date; // signed URL qachon eskiradi
  downloadable: boolean; // Vimeo per-video download yoqilganmi
}

interface VimeoFile {
  type?: string; // "video/mp4"
  quality?: string; // "hd" | "sd" | "source"
  rendition?: string; // "720p"
  width?: number;
  height?: number;
  size?: number;
  link?: string;
  expires?: string; // ISO sana (ba'zi maydonlarda)
}

/**
 * Vimeo API orqali dars videosi uchun progressive (direct MP4) download
 * linkini oladi. Account Pro/Business/Premium bo'lishi va token'da
 * `video_files` scope bo'lishi shart, hamda har videoda "download" yoqilgan
 * bo'lishi kerak.
 */
@Injectable()
export class VimeoService {
  private readonly logger = new Logger(VimeoService.name);
  private readonly api = 'https://api.vimeo.com';

  /** Maksimal sifat (storage'ni cheklash uchun). 720 = 720p gacha. */
  private readonly maxHeight = 720;

  private get token(): string | undefined {
    return process.env.VIMEO_ACCESS_TOKEN;
  }

  /** videoUrl yoki ID ko'rinishidan toza raqamli Vimeo ID ajratadi. */
  extractVimeoId(videoUrlOrId: string): string | null {
    if (!videoUrlOrId) return null;
    // Allaqachon raqam bo'lsa
    if (/^\d+$/.test(videoUrlOrId.trim())) return videoUrlOrId.trim();
    try {
      const uri = new URL(videoUrlOrId);
      const segs = uri.pathname.split('/').filter(Boolean);
      // Oxirgi raqamli segmentni ol (https://vimeo.com/123456789 yoki .../123/hash)
      for (let i = segs.length - 1; i >= 0; i--) {
        if (/^\d+$/.test(segs[i])) return segs[i];
      }
      return null;
    } catch {
      // URL emas — oxirgi raqamli bo'lakni qidir
      const m = videoUrlOrId.match(/(\d{6,})/);
      return m ? m[1] : null;
    }
  }

  /**
   * Eng yaxshi (maxHeight bilan cheklangan) progressive MP4 ni qaytaradi.
   * Vimeo download bermasa { downloadable: false } qaytadi.
   */
  async getDownloadInfo(vimeoId: string): Promise<VimeoDownloadInfo> {
    if (!this.token) {
      this.logger.warn('VIMEO_ACCESS_TOKEN .env da yo‘q');
      return this.notDownloadable(null);
    }

    const res = await axios.get(`${this.api}/videos/${vimeoId}`, {
      params: { fields: 'download,files,duration,name' },
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.vimeo.*+json;version=3.4',
      },
      timeout: 15000,
    });

    const data = res.data || {};
    const durationSec: number | null =
      typeof data.duration === 'number' ? data.duration : null;

    // `download` — haqiqiy progressive yuklab olish fayllari (afzal).
    // `files` — pleyer fayllari (ba'zilari progressive MP4).
    const candidates: VimeoFile[] = [
      ...(Array.isArray(data.download) ? data.download : []),
      ...(Array.isArray(data.files) ? data.files : []),
    ].filter(
      (f: VimeoFile) =>
        !!f.link && (!f.type || f.type === 'video/mp4') && f.quality !== 'hls',
    );

    if (candidates.length === 0) {
      return this.notDownloadable(durationSec);
    }

    const best = this.pickBest(candidates);
    if (!best?.link) return this.notDownloadable(durationSec);

    return {
      url: best.link,
      sizeBytes: typeof best.size === 'number' ? best.size : null,
      quality: best.rendition || best.quality || null,
      durationSec,
      expiresAt: this.parseExpiry(best.link, best.expires),
      downloadable: true,
    };
  }

  /** maxHeight'dan oshmaydigan eng baland; bo'lmasa eng baland mavjudini. */
  private pickBest(files: VimeoFile[]): VimeoFile | null {
    const withH = files.map((f) => ({ f, h: f.height ?? this.heightFrom(f) }));
    const underCap = withH
      .filter((x) => x.h && x.h <= this.maxHeight)
      .sort((a, b) => (b.h || 0) - (a.h || 0));
    if (underCap.length) return underCap[0].f;
    // hammasi cap'dan baland — eng pastini tanlaymiz (storage uchun)
    const sorted = withH
      .filter((x) => x.h)
      .sort((a, b) => (a.h || 0) - (b.h || 0));
    return sorted.length ? sorted[0].f : files[0];
  }

  private heightFrom(f: VimeoFile): number | undefined {
    const r = f.rendition || '';
    const m = r.match(/(\d{3,4})p/);
    return m ? parseInt(m[1], 10) : undefined;
  }

  /** Signed URL'dan amal qilish muddatini chiqaradi; topilmasa now+30min. */
  private parseExpiry(link: string, explicit?: string): Date {
    if (explicit) {
      const d = new Date(explicit);
      if (!isNaN(d.getTime())) return d;
    }
    try {
      const u = new URL(link);
      // Vimeo CDN linklari ko'pincha ?...&expires=<epoch> bilan keladi
      const exp =
        u.searchParams.get('expires') ||
        u.searchParams.get('Expires') ||
        u.searchParams.get('oauth2_token_id');
      if (exp && /^\d+$/.test(exp)) {
        const epoch = parseInt(exp, 10);
        const ms = epoch > 1e12 ? epoch : epoch * 1000;
        const d = new Date(ms);
        if (!isNaN(d.getTime()) && d.getTime() > Date.now()) return d;
      }
    } catch {
      /* ignore */
    }
    return new Date(Date.now() + 30 * 60 * 1000);
  }

  private notDownloadable(durationSec: number | null): VimeoDownloadInfo {
    return {
      url: '',
      sizeBytes: null,
      quality: null,
      durationSec,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      downloadable: false,
    };
  }
}
