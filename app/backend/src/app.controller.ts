import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return this.appService.health();
  }

  @Get('health/db')
  async dbHealth() {
    return this.appService.dbHealth();
  }

  @Post('health/db/seed-once')
  async seedOnce() {
    return this.appService.seedOnce();
  }
}
