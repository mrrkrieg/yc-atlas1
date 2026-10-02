import type { Company } from '../types';
import { companyLogoSources } from './logo-source';

type Logo = { sources: string[]; state: 'queued' | 'loading' | 'loaded' | 'failed'; sprite?: HTMLCanvasElement };

// Load only companies in view. Rasterize the circular crop once, rather than
// clipping thousands of image elements on every animation frame.
export class LogoCache {
  private records = new Map<number, Logo>();
  private queue: Logo[] = [];
  private active = 0;
  private disposed = false;
  private cancel = new Set<() => void>();

  get(id: number) { return this.records.get(id)?.sprite; }

  request(companies: Company[]) {
    this.queue = companies.flatMap(company => {
      let record = this.records.get(company.id);
      if (!record) {
        const sources=companyLogoSources(company);
        record = { sources, state: sources.length ? 'queued' : 'failed' };
        this.records.set(company.id, record);
      }
      return record.state === 'queued' ? [record] : [];
    });
    this.pump();
  }

  pause() { this.queue = []; }
  dispose() {
    this.disposed = true;
    this.pause();
    this.cancel.forEach(cancel => cancel());
    this.cancel.clear();
    this.records.clear();
  }

  private pump() {
    while (!this.disposed && this.active < 12 && this.queue.length) {
      const record = this.queue.shift()!;
      if (record.state !== 'queued') continue;
      record.state = 'loading';
      this.active++;
      const image = new Image();
      image.decoding = 'async';
      let source=0;
      const cancel = () => { clearTimeout(timeout); image.onload = null; image.onerror = null; };
      const finish = (loaded: boolean) => {
        cancel();
        this.cancel.delete(cancel);
        record.state = loaded ? 'loaded' : 'failed';
        if (loaded) {
          const sprite = document.createElement('canvas');
          sprite.width = sprite.height = 64;
          const ctx = sprite.getContext('2d')!;
          ctx.beginPath(); ctx.arc(32, 32, 31, 0, Math.PI * 2); ctx.clip();
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 64, 64);
          const scale = 64 / Math.max(image.naturalWidth, image.naturalHeight);
          const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
          ctx.drawImage(image, (64 - w) / 2, (64 - h) / 2, w, h);
          record.sprite = sprite;
        }
        this.active--;
        this.pump();
      };
      const timeout = window.setTimeout(() => finish(false), 15000);
      this.cancel.add(cancel);
      image.onload = () => finish(image.naturalWidth > 0);
      image.onerror = () => {
        if (++source < record.sources.length) image.src = record.sources[source];
        else finish(false);
      };
      image.src = record.sources[source];
    }
  }
}
