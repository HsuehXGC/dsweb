import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret } from '../common/crypto.util';
import { CATALOG_BY_KEY, SETTINGS_CATALOG, SETTING_GROUPS } from './settings.catalog';

export interface SettingView {
  key: string;
  group: string;
  label: string;
  type: string;
  value?: unknown; // 非敏感项返回值
  isSet?: boolean; // 敏感项仅返回是否已配置
  isSecret: boolean;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 后台读取：按 catalog 组织，敏感项脱敏（只回 isSet，不解密回传） */
  async getAdminSettings(): Promise<{ groups: typeof SETTING_GROUPS; settings: SettingView[] }> {
    const rows = await this.prisma.setting.findMany();
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const settings = SETTINGS_CATALOG.map((def): SettingView => {
      const row = byKey.get(def.key);
      if (def.type === 'secret') {
        return {
          key: def.key,
          group: def.group,
          label: def.label,
          type: def.type,
          isSecret: true,
          isSet: !!row && row.value !== '' && row.value !== null,
        };
      }
      return {
        key: def.key,
        group: def.group,
        label: def.label,
        type: def.type,
        isSecret: false,
        value: row ? row.value : def.default,
      };
    });
    return { groups: SETTING_GROUPS, settings };
  }

  /** 客户端公开读取：仅 catalog 中 public=true 的非敏感项 */
  async getPublicSettings(): Promise<Record<string, unknown>> {
    const publicDefs = SETTINGS_CATALOG.filter((d) => d.public && d.type !== 'secret');
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: publicDefs.map((d) => d.key) } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const out: Record<string, unknown> = {};
    for (const def of publicDefs) {
      const row = byKey.get(def.key);
      out[def.key] = row ? row.value : def.default;
    }
    return out;
  }

  /** 批量更新。敏感项加密存储；敏感项传空字符串视为「不修改」。 */
  async upsertMany(entries: Array<{ key: string; value: unknown }>): Promise<{ updated: number }> {
    let updated = 0;
    for (const { key, value } of entries) {
      const def = CATALOG_BY_KEY.get(key);
      if (!def) continue; // 忽略未知 key
      const isSecret = def.type === 'secret';

      if (isSecret) {
        if (typeof value !== 'string' || value === '') continue; // 空 = 保持原值
        const encrypted = encryptSecret(value);
        await this.prisma.setting.upsert({
          where: { key },
          update: { value: encrypted, isEncrypted: true },
          create: { key, value: encrypted, isEncrypted: true },
        });
      } else {
        const jsonValue = value as Prisma.InputJsonValue;
        await this.prisma.setting.upsert({
          where: { key },
          update: { value: jsonValue, isEncrypted: false },
          create: { key, value: jsonValue, isEncrypted: false },
        });
      }
      updated++;
    }
    return { updated };
  }
}
