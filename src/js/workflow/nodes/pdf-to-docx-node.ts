import { ClassicPreset } from 'rete';
import { BaseWorkflowNode } from './base-node';
import { pdfSocket } from '../sockets';
import type { SocketData } from '../types';
import { requirePdfInput, extractAllPdfs } from '../types';
import { downloadFile } from '../../utils/helpers.js';
import { loadPyMuPDF } from '../../utils/pymupdf-loader.js';

export class PdfToDocxNode extends BaseWorkflowNode {
  readonly category = 'Output' as const;
  readonly icon = 'ph-microsoft-word-logo';
  readonly description = 'Convert PDF to Word document';

  constructor() {
    super('PDF to Word');
    this.addInput('pdf', new ClassicPreset.Input(pdfSocket, 'PDF'));
  }

  async data(
    inputs: Record<string, SocketData[]>
  ): Promise<Record<string, SocketData>> {
    const pdfInputs = requirePdfInput(inputs, 'PDF to Word');
    const allPdfs = extractAllPdfs(pdfInputs);
    const pymupdf = await loadPyMuPDF();

    if (allPdfs.length === 1) {
      const blob = new Blob([new Uint8Array(allPdfs[0].bytes)], {
        type: 'application/pdf',
      });
      const name = allPdfs[0].filename.replace(/\.pdf$/i, '') + '.docx';
      downloadFile(await pymupdf.pdfToDocx(blob), name);
    } else {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Parallel for small batches, sequential for large ones.
      const PARALLEL_LIMIT = 4;

      if (allPdfs.length <= PARALLEL_LIMIT) {
        const docxResults = await Promise.all(
          allPdfs.map(async (pdf) => {
            const blob = new Blob([new Uint8Array(pdf.bytes)], {
              type: 'application/pdf',
            });

            const docxBlob = await pymupdf.pdfToDocx(blob);

            return {
              name: pdf.filename.replace(/\.pdf$/i, '') + '.docx',
              arrayBuffer: await docxBlob.arrayBuffer(),
            };
          })
        );

        for (const { name, arrayBuffer } of docxResults) {
          zip.file(name, arrayBuffer);
        }
      } else {
        for (const pdf of allPdfs) {
          const blob = new Blob([new Uint8Array(pdf.bytes)], {
            type: 'application/pdf',
          });

          const docxBlob = await pymupdf.pdfToDocx(blob);

          zip.file(
            pdf.filename.replace(/\.pdf$/i, '') + '.docx',
            await docxBlob.arrayBuffer()
          );
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadFile(zipBlob, 'docx_files.zip');
    }

    return {};
  }
}