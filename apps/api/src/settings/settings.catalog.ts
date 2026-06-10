/**
 * 系统配置目录 —— 对应需求文档 M9。
 * 单一事实来源：驱动 seed 默认值、后台表单（分组/标签/类型）、以及加密策略(type=secret)。
 */

export type SettingType = 'text' | 'textarea' | 'color' | 'number' | 'boolean' | 'secret';

export interface SettingDef {
  key: string;
  group: string;
  label: string;
  type: SettingType;
  /** 是否可经 /public/settings 暴露给客户端（敏感项永远 false） */
  public: boolean;
  default: unknown;
}

export const SETTING_GROUPS: Record<string, string> = {
  brand: '品牌与视觉',
  store: '店铺信息',
  tax: '税费',
  shipping: '运费',
  integrations: '第三方集成',
  payment: '支付配置',
};

export const SETTINGS_CATALOG: SettingDef[] = [
  // 品牌与视觉
  { key: 'brand.name', group: 'brand', label: '品牌名称', type: 'text', public: true, default: 'DS SmartLawn Service LLC' },
  { key: 'brand.logo_url', group: 'brand', label: 'Logo URL', type: 'text', public: true, default: '' },
  { key: 'brand.color_primary', group: 'brand', label: '主色', type: 'color', public: true, default: '#1B4332' },
  { key: 'brand.color_accent', group: 'brand', label: '强调色', type: 'color', public: true, default: '#C9A227' },

  // 店铺信息
  { key: 'store.email', group: 'store', label: '联系邮箱', type: 'text', public: true, default: 'hello@dssmartlawn.com' },
  { key: 'store.phone', group: 'store', label: '联系电话', type: 'text', public: true, default: '' },
  { key: 'store.address', group: 'store', label: '公司地址', type: 'textarea', public: true, default: 'Eastern Massachusetts, USA' },
  { key: 'store.hours', group: 'store', label: '营业时间', type: 'text', public: true, default: 'Mon–Sat · 8 AM – 6 PM ET' },
  { key: 'store.social_facebook', group: 'store', label: 'Facebook', type: 'text', public: true, default: '' },
  { key: 'store.social_instagram', group: 'store', label: 'Instagram', type: 'text', public: true, default: '' },

  // 税费
  { key: 'tax.ma_rate', group: 'tax', label: 'MA 州销售税率(%)', type: 'number', public: false, default: 6.25 },

  // 运费 / 履约
  { key: 'shipping.flat_rate', group: 'shipping', label: '统一运费($)', type: 'number', public: false, default: 0 },
  { key: 'shipping.delivery_fee', group: 'shipping', label: '送货上门费($)', type: 'number', public: true, default: 149 },
  { key: 'shipping.free_threshold', group: 'shipping', label: '免运费门槛($)', type: 'number', public: false, default: 0 },
  { key: 'shipping.pickup_location', group: 'shipping', label: '自提门店地点', type: 'text', public: true, default: 'Burlington, MA' },

  // 第三方集成（敏感）
  { key: 'integrations.google_maps_key', group: 'integrations', label: 'Google Maps API Key', type: 'secret', public: false, default: '' },
  { key: 'integrations.sentry_dsn', group: 'integrations', label: 'Sentry DSN', type: 'secret', public: false, default: '' },

  // 支付配置（敏感）
  { key: 'payment.gateway', group: 'payment', label: '支付网关', type: 'text', public: false, default: 'authorize_net' },
  { key: 'payment.api_login_id', group: 'payment', label: 'API Login ID', type: 'secret', public: false, default: '' },
  { key: 'payment.transaction_key', group: 'payment', label: 'Transaction Key', type: 'secret', public: false, default: '' },
  { key: 'payment.webhook_secret', group: 'payment', label: 'Webhook Secret', type: 'secret', public: false, default: '' },
];

export const CATALOG_BY_KEY = new Map(SETTINGS_CATALOG.map((s) => [s.key, s]));
