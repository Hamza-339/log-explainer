import { Injectable } from '@nestjs/common';
import { waitUntil } from '@vercel/functions';

@Injectable()
export class BackgroundWorkService {
  private pending: Promise<unknown>[] = [];

  run(work: () => Promise<void>): void {
    const promise = work().catch((error) => {
      // Background work is best-effort (see ADR-0001): a failure here must
      // not surface as an unhandled rejection and crash the process.
      console.error('Background work failed', error);
    });
    this.pending.push(promise);

    try {
      waitUntil(promise);
    } catch {
      // No Vercel request context (e.g. local dev, tests): the promise still
      // runs, it just isn't guaranteed to finish before the function exits.
    }
  }

  async flush(): Promise<void> {
    const tasks = this.pending;
    this.pending = [];
    await Promise.allSettled(tasks);
  }
}
