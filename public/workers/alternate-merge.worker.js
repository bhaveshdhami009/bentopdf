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

self.onmessage = async function (e) {
  const { command, files, cpdfUrl, retainPageLabels, trustedHosts } = e.data;

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

  if (command === 'interleave') {
    interleavePDFs(files, retainPageLabels === true);
  }
};

function interleavePDFs(files, retainPageLabels) {
  try {
    const loadedPdfs = [];
    const pageCounts = [];

    for (const file of files) {
      const uint8Array = new Uint8Array(file.data);
      const pdfDoc = coherentpdf.fromMemory(uint8Array, '');
      loadedPdfs.push(pdfDoc);
      pageCounts.push(coherentpdf.pages(pdfDoc));
    }

    if (loadedPdfs.length < 2) {
      throw new Error('At least two PDF files are required for interleaving.');
    }

    const maxPages = Math.max(...pageCounts);

    const pdfsToMerge = [];
    const rangesToMerge = [];

    for (let i = 1; i <= maxPages; i++) {
      for (let j = 0; j < loadedPdfs.length; j++) {
        if (i <= pageCounts[j]) {
          pdfsToMerge.push(loadedPdfs[j]);
          rangesToMerge.push(coherentpdf.range(i, i));
        }
      }
    }

    if (pdfsToMerge.length === 0) {
      throw new Error('No valid pages to merge.');
    }

    const mergedPdf = coherentpdf.mergeSame(
      pdfsToMerge,
      retainPageLabels,
      true,
      rangesToMerge
    );

    const mergedPdfBytes = coherentpdf.toMemory(mergedPdf, false, true);
    const buffer = mergedPdfBytes.buffer;
    coherentpdf.deletePdf(mergedPdf);
    loadedPdfs.forEach((pdf) => coherentpdf.deletePdf(pdf));

    self.postMessage(
      {
        status: 'success',
        pdfBytes: buffer,
      },
      [buffer]
    );
  } catch (error) {
    self.postMessage({
      status: 'error',
      message: error.message || 'Unknown error during interleave merge',
    });
  }
}
