import { isWasmAvailable, getWasmBaseUrl } from '../config/wasm-cdn-config.js';

export enum PreloadStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
  UNAVAILABLE = 'unavailable',
}

interface PreloadState {
  libreoffice: PreloadStatus;
  pymupdf: PreloadStatus;
  ghostscript: PreloadStatus;
}

const preloadState: PreloadState = {
  libreoffice: PreloadStatus.IDLE,
  pymupdf: PreloadStatus.IDLE,
  ghostscript: PreloadStatus.IDLE,
};

export function getPreloadStatus(): Readonly<PreloadState> {
  return { ...preloadState };
}

async function preloadPyMuPDF(): Promise<void> {
  if (preloadState.pymupdf !== PreloadStatus.IDLE) return;

  if (!isWasmAvailable('pymupdf')) {
    preloadState.pymupdf = PreloadStatus.UNAVAILABLE;
    return;
  }

  preloadState.pymupdf = PreloadStatus.LOADING;

  try {
    const pymupdfBaseUrl = getWasmBaseUrl('pymupdf')!;
    const gsBaseUrl = getWasmBaseUrl('ghostscript');
    const normalizedUrl = pymupdfBaseUrl.endsWith('/')
      ? pymupdfBaseUrl
      : `${pymupdfBaseUrl}/`;

    const wrapperUrl = `${normalizedUrl}dist/index.js`;
    const module = await import(/* @vite-ignore */ wrapperUrl);

    const pymupdfInstance = new module.PyMuPDF({
      assetPath: `${normalizedUrl}assets/`,
      ghostscriptUrl: gsBaseUrl || '',
    });
    await pymupdfInstance.load();
    preloadState.pymupdf = PreloadStatus.READY;
  } catch (e) {
    preloadState.pymupdf = PreloadStatus.ERROR;
    console.warn('[Preloader] PyMuPDF preload failed:', e);
  }
}

async function preloadGhostscript(): Promise<void> {
  if (preloadState.ghostscript !== PreloadStatus.IDLE) return;

  if (!isWasmAvailable('ghostscript')) {
    preloadState.ghostscript = PreloadStatus.UNAVAILABLE;
    return;
  }

  preloadState.ghostscript = PreloadStatus.LOADING;

  try {
    const { loadGsModule, setCachedGsModule } =
      await import('./ghostscript-loader.js');

    const gsModule = await loadGsModule();
    setCachedGsModule(gsModule);
    preloadState.ghostscript = PreloadStatus.READY;
  } catch (e) {
    preloadState.ghostscript = PreloadStatus.ERROR;
    console.warn('[Preloader] Ghostscript preload failed:', e);
  }
}

function scheduleIdleTask(task: () => Promise<void>): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => task(), { timeout: 5000 });
  } else {
    setTimeout(() => task(), 1000);
  }
}

export function startBackgroundPreload(): void {
  const libreOfficePages = [
    'word-to-pdf',
    'excel-to-pdf',
    'ppt-to-pdf',
    'powerpoint-to-pdf',
    'docx-to-pdf',
    'xlsx-to-pdf',
    'pptx-to-pdf',
    'csv-to-pdf',
    'rtf-to-pdf',
    'odt-to-pdf',
    'ods-to-pdf',
    'odp-to-pdf',
  ];

  const currentPath = window.location.pathname;
  const isLibreOfficePage = libreOfficePages.some((page) =>
    currentPath.includes(page)
  );

  if (isLibreOfficePage) {
    return;
  }

  scheduleIdleTask(async () => {
    await preloadPyMuPDF();
    await preloadGhostscript();
  });
}
