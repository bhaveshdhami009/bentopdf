let cpdfLoaded = false;

function loadCpdf(cpdfUrl, trustedHosts) {
  if (cpdfLoaded) return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (typeof coherentpdf !== 'undefined') {
      cpdfLoaded = true;
      resolve();
      return;
    }

    try {
      const host = new URL(cpdfUrl, self.location.origin).hostname;
      if (!trustedHosts || !trustedHosts.includes(host)) {
        throw new Error('Untrusted CoherentPDF URL host: ' + host);
      }
      self.importScripts(cpdfUrl);
      cpdfLoaded = true;
      resolve();
    } catch (error) {
      reject(new Error('Failed to load CoherentPDF: ' + error.message));
    }
  });
}

function generateTableOfContentsInWorker(
  pdfData,
  title,
  fontSize,
  fontFamily,
  addBookmark
) {
  try {
    const uint8Array = new Uint8Array(pdfData);
    const pdf = coherentpdf.fromMemory(uint8Array, '');

    coherentpdf.startGetBookmarkInfo(pdf);
    const bookmarkCount = coherentpdf.numberBookmarks();
    coherentpdf.endGetBookmarkInfo();

    if (bookmarkCount === 0) {
      coherentpdf.deletePdf(pdf);
      self.postMessage({
        status: 'error',
        message:
          'This PDF does not have any bookmarks. Please add bookmarks first using the Bookmark tool.',
      });
      return;
    }

    coherentpdf.tableOfContents(pdf, fontFamily, fontSize, title, addBookmark);
    const outputBytes = coherentpdf.toMemory(pdf, false, false);
    const outputBytesBuffer = outputBytes.buffer;
    coherentpdf.deletePdf(pdf);

    self.postMessage(
      {
        status: 'success',
        pdfBytes: outputBytesBuffer,
      },
      [outputBytesBuffer]
    );
  } catch (error) {
    self.postMessage({
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Unknown error occurred during table of contents generation.',
    });
  }
}

self.onmessage = async function (e) {
  const { cpdfUrl, trustedHosts } = e.data;

  if (!cpdfUrl) {
    self.postMessage({
      status: 'error',
      message:
        'CoherentPDF URL not provided. Please configure it in WASM Settings.',
    });
    return;
  }

  try {
    await loadCpdf(cpdfUrl, trustedHosts);
  } catch (error) {
    self.postMessage({
      status: 'error',
      message: error.message,
    });
    return;
  }

  if (e.data.command === 'generate-toc') {
    generateTableOfContentsInWorker(
      e.data.pdfData,
      e.data.title,
      e.data.fontSize,
      e.data.fontFamily,
      e.data.addBookmark
    );
  }
};
