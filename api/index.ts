import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { createValidationPipe } from '../src/validation-pipe';

let cachedServer: Express | undefined;

async function createServer(): Promise<Express> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  app.useGlobalPipes(createValidationPipe());
  await app.init();
  return expressApp;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  if (!cachedServer) {
    cachedServer = await createServer();
  }
  cachedServer(req, res);
}
