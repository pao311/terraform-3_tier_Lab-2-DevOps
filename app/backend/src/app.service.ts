import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { execFile } from 'child_process';
import * as os from 'os';
import { join } from 'path';
import { PrismaService } from './prisma/prisma.service';
import { STUDENT_SEED_DATA } from './students/students.seed-data';

export interface InstanceInfo {
  hostname: string;
  podName: string | null;
  podIp: string | null;
  nodeName: string | null;
}

@Injectable()
export class AppService {
  private static readonly DB_BOOTSTRAP_LOCK_KEY = 314159;
  private readonly instanceInfo: InstanceInfo;

  constructor(private readonly prisma: PrismaService) {
    this.instanceInfo = {
      hostname: os.hostname(),
      podName: process.env.POD_NAME || process.env.INSTANCE_ID || null,
      podIp: process.env.POD_IP || process.env.INSTANCE_PRIVATE_IP || null,
      nodeName: process.env.NODE_NAME || process.env.INSTANCE_AZ || null,
    };
  }

  getHello(): string {
    return 'Hello World!';
  }

  health() {
    return {
      status: 'ok',
      service: 'backend',
      time: new Date().toISOString(),
      instance: this.instanceInfo,
    };
  }

  async dbHealth() {
    await this.prisma.$queryRaw`SELECT 1`;
    const seedState = await this.getDbSeedState();
    return { status: 'ok', ...seedState };
  }

  async seedOnce() {
    await this.prisma.$queryRaw`SELECT 1`;

    const lockAcquired = await this.tryAcquireBootstrapLock();
    if (!lockAcquired) {
      throw new ConflictException('Database bootstrap is already in progress.');
    }

    try {
      let seedState = await this.getDbSeedState();
      if (!seedState.schemaReady) {
        await this.runMigrations();
        seedState = await this.getDbSeedState();
      }

      if (!seedState.schemaReady) {
        throw new ServiceUnavailableException(
          'Database schema is not ready after migration deploy.',
        );
      }

      if (seedState.seeded) {
        throw new ConflictException('Database is already seeded.');
      }

      const insertedCount = await this.prisma.$transaction(async (tx) => {
        const created = await tx.student.createMany({
          data: STUDENT_SEED_DATA,
          skipDuplicates: true,
        });

        await tx.seedState.upsert({
          where: { id: 1 },
          create: {
            id: 1,
            isSeeded: true,
            seededAt: new Date(),
          },
          update: {
            isSeeded: true,
            seededAt: new Date(),
          },
        });

        return created.count;
      });

      return {
        status: 'ok',
        seeded: true,
        insertedCount,
      };
    } finally {
      await this.releaseBootstrapLock();
    }
  }

  private async runMigrations(): Promise<void> {
    const prismaBinary = join(
      process.cwd(),
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
    );

    await new Promise<void>((resolve, reject) => {
      execFile(
        prismaBinary,
        ['migrate', 'deploy'],
        { cwd: process.cwd(), env: process.env },
        (error, _stdout, stderr) => {
          if (error) {
            reject(
              new ServiceUnavailableException(
                `Migration deploy failed: ${stderr || error.message}`,
              ),
            );
            return;
          }
          resolve();
        },
      );
    });
  }

  private async tryAcquireBootstrapLock(): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_lock(${AppService.DB_BOOTSTRAP_LOCK_KEY}) AS locked
    `;
    return rows[0]?.locked === true;
  }

  private async releaseBootstrapLock(): Promise<void> {
    try {
      await this.prisma.$queryRaw`
        SELECT pg_advisory_unlock(${AppService.DB_BOOTSTRAP_LOCK_KEY})
      `;
    } catch {
      return;
    }
  }

  private async getDbSeedState(): Promise<{
    seeded: boolean;
    seededAt: string | null;
    schemaReady: boolean;
  }> {
    try {
      const seedState = await this.prisma.seedState.findUnique({
        where: { id: 1 },
      });

      return {
        seeded: seedState?.isSeeded ?? false,
        seededAt: seedState?.seededAt?.toISOString() ?? null,
        schemaReady: true,
      };
    } catch (error) {
      if (this.isMissingTableError(error)) {
        return {
          seeded: false,
          seededAt: null,
          schemaReady: false,
        };
      }
      throw new InternalServerErrorException(
        'Unable to determine database seed state.',
      );
    }
  }

  private isMissingTableError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2021'
    );
  }
}
