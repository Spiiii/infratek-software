"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  remove(widgetId: string): void;
};

declare global { interface Window { turnstile?: TurnstileApi } }

export function TurnstileWidget({ siteKey, resetKey, onToken, onFailure }: {
  siteKey: string;
  resetKey: number;
  onToken(token: string): void;
  onFailure(): void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | undefined>(undefined);
  const [scriptReady, setScriptReady] = useState(false);

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile || widgetRef.current) return;
    widgetRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onToken(token),
      "expired-callback": onFailure,
      "error-callback": onFailure,
      theme: "light",
    });
  }, [onFailure, onToken, siteKey]);

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = undefined;
    };
  }, [renderWidget, resetKey, scriptReady]);

  if (!siteKey) {
    return <p role="alert" className="text-sm text-red-600">Xác minh hiện chưa khả dụng. Vui lòng liên hệ Infratek hoặc thử lại sau.</p>;
  }

  return (
    <div className="space-y-3" aria-label="Xác minh người dùng">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={onFailure}
      />
      <div ref={containerRef} className="min-h-[65px] max-w-full overflow-hidden" />
    </div>
  );
}
