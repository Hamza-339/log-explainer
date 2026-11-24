import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { DatabaseSchemaInitializer } from './database-schema-initializer';
import { PG_POOL } from './pg-pool.token';

export { PG_POOL };

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      // Capped to 1: each serverless invocation gets its own container, so a
      // multi-connection pool per instance would just multiply against
      // Neon's pooled endpoint's own connection limit for no benefit.
      useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL, max: 1 }),
    },
    DatabaseSchemaInitializer,
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
