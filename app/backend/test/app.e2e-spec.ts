import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let createdId: string | null = null;
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    if (createdId) {
      await prisma.student
        .delete({ where: { id: createdId } })
        .catch(() => undefined);
    }
    await app.close();
    await prisma.$disconnect();
  });

  it('/ (GET)', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'backend',
    });
    expect(typeof response.body.time).toBe('string');
  });

  it('/health/db (GET)', async () => {
    await request(app.getHttpServer()).get('/health/db').expect(200);
  });

  it('/students (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/students')
      .send({
        firstname: 'E2E',
        lastname: `Test-${uniqueSuffix}`,
        email: `e2e.${uniqueSuffix}@example.com`,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      firstname: 'E2E',
      lastname: `Test-${uniqueSuffix}`,
      email: `e2e.${uniqueSuffix}@example.com`,
    });
    expect(response.body.id).toBeDefined();
    createdId = response.body.id;
  });

  it('/students (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/students')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    const found = response.body.find(
      (student: { id: string }) => student.id === createdId,
    );
    expect(found).toBeDefined();
  });

  it('/students/:id (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/students/${createdId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: createdId,
      email: `e2e.${uniqueSuffix}@example.com`,
    });
  });

  it('/students/:id (PUT)', async () => {
    const response = await request(app.getHttpServer())
      .put(`/students/${createdId}`)
      .send({
        firstname: 'E2E-Updated',
        lastname: `Updated-${uniqueSuffix}`,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: createdId,
      firstname: 'E2E-Updated',
      lastname: `Updated-${uniqueSuffix}`,
      email: `e2e.${uniqueSuffix}@example.com`,
    });
  });

  it('/students/:id (DELETE)', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/students/${createdId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: createdId,
    });
  });

  it('/students/:id (GET) -> 404', async () => {
    await request(app.getHttpServer())
      .get(`/students/${createdId}`)
      .expect(404);
  });
});
