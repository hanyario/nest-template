import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { APP_CONFIG_TOKEN, IAppConfig } from './configs/app-config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { syncRoute } from './utils/sync-route';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

export async function bootstrap(app: NestExpressApplication) {
  const configService = app.get(ConfigService);
  const appConfig = configService.get<IAppConfig>(APP_CONFIG_TOKEN);
  app.useGlobalPipes(
    new ValidationPipe({
      disableErrorMessages: appConfig.env === 'production',
      whitelist: true,
      transform: true,
    }),
  );
  if (appConfig.env !== 'production') {
    app.enableCors();
  }
  app.use(helmet());
  return app;
}

async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    snapshot: true,
  });
  const configService = app.get(ConfigService);
  const appConfig = configService.get<IAppConfig>(APP_CONFIG_TOKEN);
  const config = new DocumentBuilder()
    .setTitle(appConfig.appName)
    .setDescription(appConfig.appDescription)
    .setVersion(appConfig.appVersion)
    .build();
  await bootstrap(app);
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('sapi', app, document);
  await app.listen(appConfig.port);
  await syncRoute(app);
  Logger.log(`-------------------------------------`, 'Bootstrap');
  Logger.log(
    `Server running on http://${appConfig.appHost}:${appConfig.port}`,
    'Bootstrap',
  );
  Logger.log(
    `Swagger running on http://${appConfig.appHost}:${appConfig.port}/sapi`,
    'Bootstrap',
  );
  Logger.log(`Environment: ${appConfig.env}`, 'Bootstrap');
  Logger.log(`Version: ${appConfig.appVersion}`, 'Bootstrap');
  Logger.log(`-------------------------------------`, 'Bootstrap');
}

if (require.main === module) {
  main();
}
