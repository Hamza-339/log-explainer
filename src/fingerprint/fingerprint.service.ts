import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.token';
import { computeFingerprint, FingerprintableErrorEvent } from './compute-fingerprint';

export interface SightingResult {
  fingerprint: string;
  isNew: boolean;
}

@Injectable()
export class FingerprintService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async registerSighting(errorEvent: FingerprintableErrorEvent): Promise<SightingResult> {
    const fingerprint = computeFingerprint(errorEvent);
    const { rowCount } = await this.pool.query(
      `INSERT INTO fingerprints (fingerprint, error_type)
       VALUES ($1, $2)
       ON CONFLICT (fingerprint) DO NOTHING`,
      [fingerprint, errorEvent.errorType],
    );
    return { fingerprint, isNew: rowCount === 1 };
  }
}
