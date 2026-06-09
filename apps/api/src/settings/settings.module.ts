import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController, SettingsPublicController } from './settings.controller';

@Module({
  controllers: [SettingsController, SettingsPublicController],
  providers: [SettingsService],
})
export class SettingsModule {}
