import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';

export interface VimeoUploadTicket {
  vimeoId: string; // yangi videoning raqamli IDsi
  uploadLink: string; // brauzer tus orqali fayl bytelarini PATCH qiladigan endpoint
  videoLink: string; // lesson.videoUrl sifatida saqlanadigan kanonik havola (unlisted bo'lsa hash bilan)
}

export interface VimeoFolderInfo {
  id: string;
  name: string;
  count: number | null; // papkadagi elementlar soni
}

export interface VimeoLibraryVideo {
  id: string;
  name: string;
  link: string; // vimeo.com/<id> — lesson videoUrl sifatida ishlatiladi
  durationSec: number | null;
  thumb: string | null; // kichik oldindan ko'rish rasmi
  view: string | null; // privacy: anybody | unlisted | ...
}

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
   * Vimeo'da yangi bo'sh video yaratadi va tus (resumable) upload endpoint'ini
   * qaytaradi. Faylning o'zi serverdan o'tmaydi — admin brauzeri to'g'ridan-to'g'ri
   * `uploadLink`ka tus protokoli bilan yuklaydi. Token'da `upload` + `edit`
   * scope bo'lishi shart, aks holda Vimeo 401/403 qaytaradi.
   *
   * @param sizeBytes yuklanadigan faylning aniq hajmi (tus uchun majburiy)
   * @param name video nomi (odatda dars nomi)
   */
  async createUploadTicket(
    sizeBytes: number,
    name?: string,
  ): Promise<VimeoUploadTicket> {
    if (!this.token) {
      throw new ServiceUnavailableException(
        'VIMEO_ACCESS_TOKEN sozlanmagan — .env ni tekshiring',
      );
    }
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      throw new BadRequestException("Fayl hajmi (size) noto'g'ri");
    }

    try {
      const res = await axios.post(
        `${this.api}/me/videos`,
        {
          upload: { approach: 'tus', size: String(Math.round(sizeBytes)) },
          name: (name || 'Dars videosi').slice(0, 128),
          // unlisted: Vimeo'da qidiruvda chiqmaydi, lekin havola/embed orqali ochiladi.
          // embed public — mobil ilova va admin iframe pleyerlari uchun.
          // download true — offline yuklab olish funksiyasi ishlashi uchun.
          privacy: { view: 'unlisted', embed: 'public', download: true },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.vimeo.*+json;version=3.4',
          },
          timeout: 20000,
        },
      );

      const data = res.data || {};
      const uploadLink: string | undefined = data.upload?.upload_link;
      const vimeoId = this.extractVimeoId(data.uri || data.link || '');
      const videoLink: string =
        data.link || (vimeoId ? `https://vimeo.com/${vimeoId}` : '');

      if (!uploadLink || !vimeoId) {
        this.logger.error(
          `Vimeo javobi kutilmagan: ${JSON.stringify(data).slice(0, 300)}`,
        );
        throw new Error('Vimeo upload_link/id qaytarmadi');
      }

      return { vimeoId, uploadLink, videoLink };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      const vimeoMsg =
        err?.response?.data?.error ||
        err?.response?.data?.developer_message ||
        err?.message;
      this.logger.error(`Vimeo upload ticket xatosi: ${vimeoMsg}`);
      throw new ServiceUnavailableException(
        `Vimeo'da upload boshlab bo'lmadi: ${vimeoMsg || 'nomaʼlum xato'}. ` +
          "Token'da `upload` va `edit` scope borligini tekshiring.",
      );
    }
  }

  private authHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.vimeo.*+json;version=3.4',
    };
  }

  private idFromUri(uri?: string): string {
    if (!uri) return '';
    // "/videos/1211013529" yoki "/videos/1211013529:hash" -> "1211013529"
    const last = uri.split('/').filter(Boolean).pop() || '';
    return last.split(':')[0];
  }

  /**
   * Admin kutubxonasi uchun: foydalanuvchi Vimeo papkalari ro'yxati.
   * "My library" kabi bo'sh tizim papkalari ham qaytadi — frontendda saralanadi.
   */
  async listFolders(): Promise<VimeoFolderInfo[]> {
    if (!this.token) {
      throw new ServiceUnavailableException('VIMEO_ACCESS_TOKEN sozlanmagan');
    }
    try {
      const res = await axios.get(`${this.api}/me/folders`, {
        params: {
          fields: 'uri,name,metadata.connections.items.total',
          per_page: 100,
          sort: 'date',
          direction: 'asc',
        },
        headers: this.authHeaders(),
        timeout: 15000,
      });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      return data.map(
        (f: any): VimeoFolderInfo => ({
          id: this.idFromUri(f.uri),
          name: f.name || '(nomsiz)',
          count: f.metadata?.connections?.items?.total ?? null,
        }),
      );
    } catch (err) {
      this.logger.error(`Vimeo papkalar xatosi: ${err?.message}`);
      throw new ServiceUnavailableException('Vimeo papkalarni olishda xatolik');
    }
  }

  /**
   * Bitta papkadagi videolar (bir sahifada 100 tagacha).
   * page — 1 dan boshlanadi; hasNext keyingi sahifa borligini bildiradi.
   */
  async listFolderVideos(
    folderId: string,
    page = 1,
  ): Promise<{ videos: VimeoLibraryVideo[]; total: number; hasNext: boolean }> {
    if (!this.token) {
      throw new ServiceUnavailableException('VIMEO_ACCESS_TOKEN sozlanmagan');
    }
    if (!/^\d+$/.test(String(folderId))) {
      throw new BadRequestException("folderId noto'g'ri");
    }
    try {
      const res = await axios.get(
        `${this.api}/me/folders/${folderId}/videos`,
        {
          params: {
            fields:
              'uri,name,link,duration,privacy.view,pictures.sizes.link',
            per_page: 100,
            page: Math.max(1, page),
            sort: 'alphabetical',
            direction: 'asc',
          },
          headers: this.authHeaders(),
          timeout: 20000,
        },
      );
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      const videos = data.map((v: any): VimeoLibraryVideo => {
        const sizes: any[] = v.pictures?.sizes || [];
        // ~295px kenglikdagi thumbnailni tanlaymiz (grid uchun yetarli)
        const pic =
          sizes.find((s) => s.width >= 200 && s.width <= 320) ||
          sizes[Math.min(2, sizes.length - 1)] ||
          sizes[0];
        return {
          id: this.idFromUri(v.uri),
          name: v.name || '(nomsiz)',
          link: v.link || (v.uri ? `https://vimeo.com${v.uri}` : ''),
          durationSec: typeof v.duration === 'number' ? v.duration : null,
          thumb: pic?.link || null,
          view: v.privacy?.view || null,
        };
      });
      return {
        videos,
        total: res.data?.total ?? videos.length,
        hasNext: !!res.data?.paging?.next,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Vimeo papka videolari xatosi: ${err?.message}`);
      throw new ServiceUnavailableException(
        'Vimeo papka videolarini olishda xatolik',
      );
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
