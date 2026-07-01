/**
 * Service Worker Registration
 * Registers the service worker to enable offline caching
 *
 * Note: Service Worker is disabled in development mode to prevent
 * conflicts with Vite's HMR (Hot Module Replacement)
 */

// Skip service worker registration in development mode
const isDevelopment =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.port !== '';

export function collectTrustedWasmHosts(): string[] {
  const hosts = new Set<string>();
  const candidates = [
    import.meta.env.VITE_WASM_PYMUPDF_URL,
    import.meta.env.VITE_WASM_GS_URL,
    import.meta.env.VITE_WASM_CPDF_URL,
    import.meta.env.VITE_TESSERACT_WORKER_URL,
    import.meta.env.VITE_TESSERACT_CORE_URL,
    import.meta.env.VITE_TESSERACT_LANG_URL,
    import.meta.env.VITE_OCR_FONT_BASE_URL,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      hosts.add(new URL(raw).origin);
    } catch {
      console.warn(
        `[SW] Ignoring malformed VITE_* URL for SW trusted-hosts: ${raw}`
      );
    }
  }
  return Array.from(hosts);
}

function sendTrustedHostsToSw(target: ServiceWorker | null | undefined) {
  if (!target) return;
  const hosts = collectTrustedWasmHosts();
  if (hosts.length === 0) return;
  target.postMessage({ type: 'SET_TRUSTED_CDN_HOSTS', hosts });
}

if (!isDevelopment && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swPath)
      .then((registration) => {

        sendTrustedHostsToSw(
          registration.active || registration.waiting || registration.installing
        );

        setInterval(
          () => {
            registration.update();
          },
          24 * 60 * 60 * 1000
        );

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                sendTrustedHostsToSw(newWorker);
              }
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {

                if (
                  confirm(
                    'A new version of BentoPDF is available. Reload to update?'
                  )
                ) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[SW] Service Worker registration failed:', error);
      });

    navigator.serviceWorker.ready.then((registration) => {
      sendTrustedHostsToSw(registration.active);
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}
