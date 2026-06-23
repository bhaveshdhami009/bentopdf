import { state } from '../state.js';
import {
  showLoader,
  hideLoader,
  showAlert,
  renderPageThumbnails,
  renderFileDisplay,
  switchView,
} from '../ui.js';
import {
  formatIsoDate,
  readFileAsArrayBuffer,
  getPDFDocument,
} from '../utils/helpers.js';
import { setupCanvasEditor } from '../canvasEditor.js';
import { toolLogic } from '../logic/index.js';
import { renderDuplicateOrganizeThumbnails } from '../logic/duplicate-organize.js';
import { icons, createIcons } from 'lucide';
import Sortable from 'sortablejs';
import { makeUniqueFileKey } from '../utils/deduplicate-filename.js';
import {
  promptAndDecryptFile,
  handleEncryptedFiles,
} from '../utils/password-prompt.js';
import {
  multiFileTools,
  simpleTools,
  singlePdfLoadTools,
} from '../config/pdf-tools.js';
import * as pdfjsLib from 'pdfjs-dist';
import { loadPdfDocument } from '../utils/load-pdf-document.js';
import {
  viewMetadataTool,
  editMetadataTool,
  setupPdfToJpg,
  setupPdfToPng,
  setupPdfToWebp,
  setupRotateTool,
} from './tools/index.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export {
  getRotationState,
  updateRotationState,
  resetRotationState,
  initializeRotationState,
} from '../utils/rotation-state.js';

const rotationState: number[] = [];
let imageSortableInstance: Sortable | null = null;
const activeImageUrls = new Map<File, string>();

async function handleSinglePdfUpload(toolId: string, file: File) {
  showLoader('Loading PDF...');
  try {
    if (toolId === 'form-filler') {
      hideLoader();

      const optionsDiv = document.getElementById('form-filler-options');
      if (optionsDiv) optionsDiv.classList.remove('hidden');

      const processBtn = document.getElementById('process-btn');
      if (processBtn) {
        const logic = toolLogic[toolId];
        if (logic && typeof logic === 'object' && logic.process) {
          processBtn.onclick = logic.process;
        }
      }

      const logic = toolLogic[toolId];
      if (logic && typeof logic === 'object' && logic.setup) {
        await logic.setup();
      }
      return;
    }

    const pdfBytes = await readFileAsArrayBuffer(file);
    state.pdfDoc = await loadPdfDocument(pdfBytes as ArrayBuffer);
    hideLoader();

    if (
      state.pdfDoc.isEncrypted &&
      toolId !== 'decrypt' &&
      toolId !== 'change-permissions' &&
      toolId !== 'remove-restrictions'
    ) {
      const decryptedFile = await promptAndDecryptFile(file);
      if (!decryptedFile) {
        switchView('grid');
        return;
      }
      const decryptedBytes = await readFileAsArrayBuffer(decryptedFile);
      state.pdfDoc = await loadPdfDocument(decryptedBytes as ArrayBuffer);
      state.files = [decryptedFile];
    }

    const optionsDiv = document.querySelector(
      '[id$="-options"], [id$="-preview"], [id$="-organizer"], [id$="-rotator"], [id$="-editor"]'
    );
    if (optionsDiv) optionsDiv.classList.remove('hidden');

    const processBtn = document.getElementById('process-btn');
    if (processBtn) {
      (processBtn as HTMLButtonElement).disabled = false;
      processBtn.classList.remove('hidden');
      const logic = toolLogic[toolId];
      if (logic) {
        const func =
          typeof logic === 'object' && typeof logic.process === 'function'
            ? logic.process
            : typeof logic === 'function'
              ? logic
              : null;
        if (func) processBtn.onclick = func;
      }
    }

    if (
      [
        'split',
        'delete-pages',
        'add-blank-page',
        'extract-pages',
        'add-header-footer',
      ].includes(toolId)
    ) {
      document.getElementById('total-pages').textContent = state.pdfDoc
        .getPageCount()
        .toString();
    }

    if (
      toolId === 'organize' ||
      toolId === 'rotate' ||
      toolId === 'delete-pages'
    ) {
      await renderPageThumbnails(toolId, state.pdfDoc);

      if (toolId === 'rotate') {
        setupRotateTool();
      }
    }

    if (toolId === 'duplicate-organize') {
      await renderDuplicateOrganizeThumbnails();
    }
    if (['crop', 'redact'].includes(toolId)) {
      await setupCanvasEditor(toolId);
    }

    if (toolId === 'view-metadata') {
      await viewMetadataTool();
    }

    if (toolId === 'edit-metadata') {
      editMetadataTool();
    }

    if (toolId === 'cropper') {
      document
        .getElementById('cropper-ui-container')
        .classList.remove('hidden');
    }

    if (toolId === 'page-dimensions') {
      const pageDimLogic = toolLogic['page-dimensions'];
      if (typeof pageDimLogic === 'function') pageDimLogic();
    }

    if (toolId === 'pdf-to-jpg') {
      setupPdfToJpg();
    }

    if (toolId === 'pdf-to-png') {
      setupPdfToPng();
    }

    if (toolId === 'pdf-to-webp') {
      setupPdfToWebp();
    }

    const setupLogic = toolLogic[toolId];
    if (
      setupLogic &&
      typeof setupLogic === 'object' &&
      typeof setupLogic.setup === 'function'
    ) {
      setupLogic.setup();
    }
  } catch (e) {
    hideLoader();
    showAlert(
      'Error',
      'Could not load PDF. The file may be invalid, corrupted, or password-protected.'
    );
    console.error(e);
  }
}

async function handleMultiFileUpload(toolId: string) {
  if (
    toolId === 'merge' ||
    toolId === 'alternate-merge' ||
    toolId === 'reverse-pages'
  ) {
    showLoader('Loading PDF documents...');

    const pdfFilesUnloaded: File[] = [];

    state.files.forEach((file) => {
      if (file.type === 'application/pdf') {
        pdfFilesUnloaded.push(file);
      }
    });

    const pdfFilesLoaded = await Promise.all(
      pdfFilesUnloaded.map(async (file) => {
        const pdfBytes = await readFileAsArrayBuffer(file);
        const pdfDoc = await loadPdfDocument(pdfBytes as ArrayBuffer);

        return {
          file,
          pdfDoc,
        };
      })
    );

    const encryptedIndices: number[] = [];
    pdfFilesLoaded.forEach((pdf, index) => {
      if (pdf.pdfDoc.isEncrypted) {
        encryptedIndices.push(index);
      }
    });

    if (encryptedIndices.length > 0) {
      hideLoader();
      const decryptedFiles = await handleEncryptedFiles(
        pdfFilesUnloaded,
        encryptedIndices
      );

      for (const [index, decryptedFile] of decryptedFiles) {
        const originalIndex = state.files.indexOf(pdfFilesUnloaded[index]);
        if (originalIndex !== -1) {
          state.files[originalIndex] = decryptedFile;
        }
      }

      const skippedFiles = new Set(
        encryptedIndices
          .filter((i) => !decryptedFiles.has(i))
          .map((i) => pdfFilesUnloaded[i])
      );
      if (skippedFiles.size > 0) {
        state.files = state.files.filter((f) => !skippedFiles.has(f));
      }

      if (
        state.files.filter((f) => f.type === 'application/pdf').length === 0
      ) {
        switchView('grid');
        return;
      }

      showLoader('Loading PDF documents...');
    }
  }

  const processBtn = document.getElementById('process-btn');
  if (processBtn) {
    (processBtn as HTMLButtonElement).disabled = false;
    const logic = toolLogic[toolId];
    if (logic) {
      const func =
        typeof logic === 'object' && typeof logic.process === 'function'
          ? logic.process
          : typeof logic === 'function'
            ? logic
            : null;
      if (func) processBtn.onclick = func;
    }
  }

  if (toolId === 'alternate-merge') {
    const altMerge = toolLogic['alternate-merge'];
    if (typeof altMerge === 'object' && altMerge.setup) altMerge.setup();
  } else if (toolId === 'image-to-pdf') {
    const imageList = document.getElementById('image-list');

    const renderedFiles = new Set(
      Array.from(imageList.querySelectorAll('li')).map(
        (li) => li.dataset.fileKey
      )
    );

    state.files.forEach((file, index) => {
      if (!file) {
        console.error('Invalid file encountered in state.files');
        return;
      }

      const fileKey = makeUniqueFileKey(index, file.name);

      if (renderedFiles.has(fileKey)) {
        return;
      }

      let url = activeImageUrls.get(file);
      if (!url) {
        url = URL.createObjectURL(file);
        activeImageUrls.set(file, url);
      }

      const li = document.createElement('li');
      li.className = 'relative group cursor-move';
      li.dataset.fileKey = fileKey;
      li.dataset.fileIndex = String(index);

      const wrapper = document.createElement('div');
      wrapper.className =
        'w-full h-36 sm:h-40 md:h-44 bg-gray-900 rounded-md border-2 border-gray-600 flex items-center justify-center overflow-hidden';

      const img = document.createElement('img');
      try {
        const parsed = new URL(url);
        if (parsed.protocol === 'blob:') {
          img.src = parsed.href;
        }
      } catch {
        console.warn('Invalid blob URL for preview');
      }
      img.className = 'max-w-full max-h-full object-contain';

      const p = document.createElement('p');
      p.className =
        'absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center truncate p-1';
      p.textContent = file.name;

      wrapper.appendChild(img);
      li.append(wrapper, p);
      imageList.appendChild(li);
    });

    const syncStateWithDOM = () => {
      const domOrder = Array.from(imageList.querySelectorAll('li')).map((li) =>
        Number(li.dataset.fileIndex)
      );
      const reordered = domOrder.map((i) => state.files[i]);
      state.files.length = 0;
      reordered.forEach((f) => state.files.push(f));
      Array.from(imageList.querySelectorAll('li')).forEach((li, i) => {
        (li as HTMLElement).dataset.fileIndex = String(i);
      });
    };

    if (!imageSortableInstance) {
      imageSortableInstance = Sortable.create(imageList, {
        animation: 150,
        onEnd: () => {
          syncStateWithDOM();
        },
      });
    }

    syncStateWithDOM();

    const opts = document.getElementById('image-to-pdf-options');
    if (opts && opts.classList.contains('hidden')) {
      opts.classList.remove('hidden');
      const slider = document.getElementById(
        'image-pdf-quality'
      ) as HTMLInputElement;
      const value = document.getElementById('image-pdf-quality-value');
      if (slider && value) {
        const update = () =>
          (value.textContent = `${Math.round(parseFloat(slider.value) * 100)}%`);
        slider.addEventListener('input', update);
        update();
      }
    }
  }

  if (toolId === 'pdf-to-jpg') {
    const qualitySlider = document.getElementById(
      'jpg-quality'
    ) as HTMLInputElement;
    const qualityValue = document.getElementById('jpg-quality-value');
    if (qualitySlider && qualityValue) {
      const updateValue = () => {
        qualityValue.textContent = `${Math.round(parseFloat(qualitySlider.value) * 100)}%`;
      };
      qualitySlider.addEventListener('input', updateValue);
      updateValue();
    }
  }

  if (toolId === 'pdf-to-png') {
    const qualitySlider = document.getElementById(
      'png-quality'
    ) as HTMLInputElement;
    const qualityValue = document.getElementById('png-quality-value');
    if (qualitySlider && qualityValue) {
      const updateValue = () => {
        qualityValue.textContent = `${qualitySlider.value}x`;
      };
      qualitySlider.addEventListener('input', updateValue);
      updateValue();
    }
  }

  if (toolId === 'pdf-to-webp') {
    const qualitySlider = document.getElementById(
      'webp-quality'
    ) as HTMLInputElement;
    const qualityValue = document.getElementById('webp-quality-value');
    if (qualitySlider && qualityValue) {
      const updateValue = () => {
        qualityValue.textContent = `${Math.round(parseFloat(qualitySlider.value) * 100)}%`;
      };
      qualitySlider.addEventListener('input', updateValue);
      updateValue();
    }
  }

  if (toolId === 'png-to-pdf') {
    const optionsDiv = document.getElementById(`${toolId}-options`);
    if (optionsDiv) {
      optionsDiv.classList.remove('hidden');
    }
  }
}

export function setupFileInputHandler(toolId: string) {
  const fileInput = document.getElementById('file-input');
  const isMultiFileTool = multiFileTools.includes(toolId);
  let isFirstUpload = true;

  const processFiles = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;

    if (toolId === 'image-to-pdf') {
      const validTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/bmp',
        'image/tiff',
      ];
      const validFiles = newFiles.filter((file) =>
        validTypes.includes(file.type)
      );

      if (validFiles.length < newFiles.length) {
        showAlert(
          'Invalid Files',
          'Some files were skipped because they are not supported images.'
        );
      }

      newFiles = validFiles;
      if (newFiles.length === 0) return;
    }

    if (!isMultiFileTool || isFirstUpload) {
      state.files = newFiles;
    } else {
      state.files = [...state.files, ...newFiles];
    }
    isFirstUpload = false;

    const fileDisplayArea = document.getElementById('file-display-area');
    if (fileDisplayArea) {
      renderFileDisplay(fileDisplayArea, state.files);
    }

    const fileControls = document.getElementById('file-controls');
    if (fileControls) {
      fileControls.classList.remove('hidden');
      createIcons({ icons });
    }

    if (isMultiFileTool) {
      if (
        toolId === 'txt-to-pdf' ||
        toolId === 'compress' ||
        toolId === 'extract-attachments' ||
        toolId === 'flatten'
      ) {
        const processBtn = document.getElementById('process-btn');
        if (processBtn) {
          (processBtn as HTMLButtonElement).disabled = false;
          if (toolId === 'compress') {
            const optionsDiv = document.getElementById('compress-options');
            if (optionsDiv) optionsDiv.classList.remove('hidden');
          }
          processBtn.onclick = () => {
            const logic = toolLogic[toolId];
            if (logic) {
              if (typeof logic === 'function') logic();
              else if (logic.process) logic.process();
            }
          };
        }
      } else {
        await handleMultiFileUpload(toolId);
      }
    } else if (singlePdfLoadTools.includes(toolId)) {
      await handleSinglePdfUpload(toolId, state.files[0]);
    } else if (simpleTools.includes(toolId)) {
      const optionsDivId =
        toolId === 'change-permissions'
          ? 'permissions-options'
          : `${toolId}-options`;
      const optionsDiv = document.getElementById(optionsDivId);
      if (optionsDiv) optionsDiv.classList.remove('hidden');
      const processBtn = document.getElementById('process-btn');
      if (processBtn) {
        (processBtn as HTMLButtonElement).disabled = false;
        processBtn.onclick = () => {
          const logic = toolLogic[toolId];
          if (logic) {
            if (typeof logic === 'function') logic();
            else if (logic.process) logic.process();
          }
        };
      }
    }
  };

  fileInput.addEventListener('change', (e) =>
    processFiles(Array.from((e.target as HTMLInputElement).files || []))
  );

  const setupAddMoreButton = () => {
    const addMoreBtn = document.getElementById('add-more-btn');
    if (addMoreBtn) {
      addMoreBtn.addEventListener('click', () => fileInput.click());
    }
  };

  const setupClearButton = () => {
    const clearBtn = document.getElementById('clear-files-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        activeImageUrls.forEach((url) => URL.revokeObjectURL(url));
        activeImageUrls.clear();

        state.files = [];
        isFirstUpload = true;
        (fileInput as HTMLInputElement).value = '';

        const fileDisplayArea = document.getElementById('file-display-area');
        if (fileDisplayArea) fileDisplayArea.textContent = '';

        const fileControls = document.getElementById('file-controls');
        if (fileControls) fileControls.classList.add('hidden');

        const toolSpecificUI = [
          'file-list',
          'page-merge-preview',
          'image-list',
          'alternate-file-list',
        ];
        toolSpecificUI.forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.textContent = '';
        });

        const processBtn = document.getElementById('process-btn');
        if (processBtn) (processBtn as HTMLButtonElement).disabled = true;
      });
    }
  };

  setTimeout(() => {
    setupAddMoreButton();
    setupClearButton();
  }, 100);
}
