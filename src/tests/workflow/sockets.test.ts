import { describe, expect, it } from 'vitest';
import {
  PDFSocket,
  ImageSocket,
  MultiPDFSocket,
  pdfSocket,
  imageSocket,
  multiPdfSocket,
  socketColors,
} from '../../js/workflow/sockets';

describe('workflow/sockets', () => {
  it('should initialize PDFSocket correctly', () => {
    const socket = new PDFSocket();
    expect(socket.name).toBe('PDF');
  });

  it('should initialize ImageSocket correctly', () => {
    const socket = new ImageSocket();
    expect(socket.name).toBe('Image');
  });

  it('should initialize MultiPDFSocket correctly', () => {
    const socket = new MultiPDFSocket();
    expect(socket.name).toBe('MultiPDF');
  });

  it('should export pre-initialized socket instances', () => {
    expect(pdfSocket).toBeInstanceOf(PDFSocket);
    expect(imageSocket).toBeInstanceOf(ImageSocket);
    expect(multiPdfSocket).toBeInstanceOf(MultiPDFSocket);
  });

  it('should export correct socket colors', () => {
    expect(socketColors.PDF).toBe('#6366f1');
    expect(socketColors.Image).toBe('#10b981');
    expect(socketColors.MultiPDF).toBe('#f59e0b');
  });
});
