'use client';

import { useEffect, useRef } from 'react';

/**
 * ProCharge / NMI Collect.js 令牌化字段（inline）。
 * 卡号/有效期/CVV 渲染在网关托管的安全 iframe 内，卡号不经我们服务器（PCI SAQ-A）。
 * 提交时调用 window.CollectJS.startPaymentRequest()，token 经回调返回。
 *
 * 仅当配置了 NEXT_PUBLIC_PAYMENT_TOKENIZATION_KEY 时启用；否则上层回退到 mock token 输入。
 */
declare global {
  interface Window {
    CollectJS?: {
      configure: (opts: Record<string, unknown>) => void;
      startPaymentRequest: () => void;
    };
  }
}

const SCRIPT_URL =
  process.env.NEXT_PUBLIC_PAYMENT_COLLECTJS_URL ?? 'https://secure.procharge.com/token/Collect.js';
const TOKENIZATION_KEY = process.env.NEXT_PUBLIC_PAYMENT_TOKENIZATION_KEY ?? '';

export const collectJsEnabled = TOKENIZATION_KEY.length > 0;

const fieldCls =
  'h-11 w-full rounded-md border border-gray-300 px-3 [&_iframe]:h-full [&_iframe]:w-full';

export function CollectJsFields({
  onToken,
  onError,
}: {
  onToken: (token: string) => void;
  onError?: (msg: string) => void;
}) {
  const configured = useRef(false);

  useEffect(() => {
    if (!collectJsEnabled) return;

    const configure = () => {
      if (configured.current || !window.CollectJS) return;
      configured.current = true;
      window.CollectJS.configure({
        variant: 'inline',
        fields: {
          ccnumber: { selector: '#cj-ccnumber', placeholder: '•••• •••• •••• ••••' },
          ccexp: { selector: '#cj-ccexp', placeholder: 'MM / YY' },
          cvv: { selector: '#cj-cvv', placeholder: 'CVV' },
        },
        callback: (resp: { token?: string }) => {
          if (resp?.token) onToken(resp.token);
          else onError?.('Tokenization failed');
        },
      });
    };

    let script = document.querySelector<HTMLScriptElement>('script[data-collectjs]');
    if (!script) {
      script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.dataset.collectjs = 'true';
      script.setAttribute('data-tokenization-key', TOKENIZATION_KEY);
      script.onload = configure;
      document.body.appendChild(script);
    } else if (window.CollectJS) {
      configure();
    } else {
      script.addEventListener('load', configure);
    }
  }, [onToken, onError]);

  if (!collectJsEnabled) return null;

  return (
    <div className="space-y-3">
      <div id="cj-ccnumber" className={fieldCls} />
      <div className="grid grid-cols-2 gap-3">
        <div id="cj-ccexp" className={fieldCls} />
        <div id="cj-cvv" className={fieldCls} />
      </div>
      <p className="text-xs text-gray-400">🔒 由 ProCharge 安全处理，卡号不经过本站服务器。</p>
    </div>
  );
}

/** 触发令牌化（提交时调用，token 经 CollectJsFields 的 callback 返回） */
export function triggerCollectJs(): boolean {
  if (window.CollectJS) {
    window.CollectJS.startPaymentRequest();
    return true;
  }
  return false;
}
