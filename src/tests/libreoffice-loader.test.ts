import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LibreOfficeConverter,
  getLibreOfficeConverter,
} from '../js/utils/libreoffice-loader.js';

const mockInitialize = vi.fn();
const mockConvert = vi.fn();
const mockDestroy = vi.fn();

let createdOptions: any = null;

vi.mock('@matbee/libreoffice-converter/browser', () => {
  return {
    WorkerBrowserConverter: class {
      constructor(options: any) {
        createdOptions = options;
      }
      initialize = mockInitialize;
      convert = mockConvert;
      destroy = mockDestroy;
    },
  };
});

describe('LibreOfficeLoader', () => {
  let converter: LibreOfficeConverter;

  beforeEach(() => {
    vi.clearAllMocks();
    createdOptions = null;
    converter = new LibreOfficeConverter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should be initialized if initialization succeeds', async () => {
      mockInitialize.mockResolvedValueOnce(undefined);

      let lastProgress: any;
      await converter.initialize((progress) => {
        lastProgress = progress;
      });

      expect(converter.isReady()).toBe(true);
      expect(mockInitialize).toHaveBeenCalled();
      expect(lastProgress).toBeDefined();
      expect(lastProgress?.phase).toBe('ready');
    });

    it('should throw an error and propagate it when initialize fails', async () => {
      mockInitialize.mockRejectedValueOnce(new Error('WASM Error'));

      await expect(converter.initialize()).rejects.toThrow('WASM Error');
      expect(converter.isReady()).toBe(false);
    });

    it('should prevent concurrent initializations', async () => {
      let resolveInit: (val?: any) => void;
      mockInitialize.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInit = resolve;
          })
      );

      const initPromise1 = converter.initialize();
      const initPromise2 = converter.initialize();

      resolveInit!(undefined);
      await Promise.all([initPromise1, initPromise2]);

      expect(converter.isReady()).toBe(true);
      expect(mockInitialize).toHaveBeenCalledTimes(1);
    });

    it('should immediately return if already initialized', async () => {
      mockInitialize.mockResolvedValueOnce(undefined);
      await converter.initialize();
      expect(converter.isReady()).toBe(true);
      expect(mockInitialize).toHaveBeenCalledTimes(1);

      await converter.initialize();
      expect(mockInitialize).toHaveBeenCalledTimes(1);
    });

    it('should pass correct onProgress, onReady, and onError to WorkerBrowserConverter', async () => {
      // Delay initialization so we can trigger progress while initialized is still false
      let resolveInit: (val?: any) => void;
      mockInitialize.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInit = resolve;
          })
      );
      const progressSpy = vi.fn();

      const initPromise = converter.initialize(progressSpy);

      expect(createdOptions).toBeDefined();

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // trigger onReady
      createdOptions.onReady();
      expect(logSpy).toHaveBeenCalledWith('[LibreOffice] Ready!');

      // trigger onError
      createdOptions.onError(new Error('Test Error'));
      expect(errorSpy).toHaveBeenCalledWith(
        '[LibreOffice] Error:',
        expect.any(Error)
      );

      // trigger onProgress from the mock internally
      createdOptions.onProgress({
        phase: 'initializing',
        percent: 50,
        message: 'WASM init',
      });
      expect(progressSpy).toHaveBeenCalledWith({
        phase: 'initializing',
        percent: 50,
        message: 'Loading conversion engine (50%)...',
      });

      // also verify the case where progress callback is null (branch coverage)
      const anotherConverter = new LibreOfficeConverter();
      let resolveAnotherInit: (val?: any) => void;
      mockInitialize.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveAnotherInit = resolve;
          })
      );
      const anotherInitPromise = anotherConverter.initialize(undefined); // no callback
      // call progress to cover "if (progressCallback)" being falsy
      createdOptions.onProgress({
        phase: 'initializing',
        percent: 50,
        message: 'WASM init',
      });

      resolveAnotherInit!(undefined);
      await anotherInitPromise;

      resolveInit!(undefined);
      await initPromise;

      logSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('convertToPdf', () => {
    it('should throw an error if convertToPdf is called before initialization', async () => {
      const file = new File(['test'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      await expect(converter.convertToPdf(file)).rejects.toThrow(
        'Converter not initialized'
      );
    });

    it('should propagate errors from convertToPdf fallback block when conversion fails', async () => {
      mockInitialize.mockResolvedValueOnce(undefined);
      await converter.initialize();

      mockConvert.mockRejectedValueOnce(new Error('Conversion Failed'));

      const file = new File(['test data'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(converter.convertToPdf(file)).rejects.toThrow(
        'Conversion Failed'
      );

      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy.mock.calls[0][0]).toContain(
        'Conversion FAILED for test.docx'
      );
      expect(errorSpy.mock.calls[1][0]).toContain('Error details');

      errorSpy.mockRestore();
    });

    it('should propagate fallback errors that are not instances of Error', async () => {
      mockInitialize.mockResolvedValueOnce(undefined);
      await converter.initialize();

      mockConvert.mockRejectedValueOnce('String Error');

      const file = new File(['test data'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(converter.convertToPdf(file)).rejects.toThrow(
        'String Error'
      );

      errorSpy.mockRestore();
    });

    it('should return a Blob when convertToPdf succeeds', async () => {
      mockInitialize.mockResolvedValueOnce(undefined);
      await converter.initialize();

      const outputData = new Uint8Array([1, 2, 3]);
      mockConvert.mockResolvedValueOnce({
        data: outputData,
        mimeType: 'application/pdf',
        logs: [],
      });

      const file = new File(['test data'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const result = await converter.convertToPdf(file);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/pdf');
      expect(mockConvert).toHaveBeenCalledTimes(1);

      const buffer = await result.arrayBuffer();
      const resultData = new Uint8Array(buffer);
      expect(resultData).toEqual(outputData);
    });

    it('should gracefully handle files without an extension', async () => {
      mockInitialize.mockResolvedValueOnce(undefined);
      await converter.initialize();

      const outputData = new Uint8Array([1, 2, 3]);
      mockConvert.mockResolvedValueOnce({
        data: outputData,
        mimeType: 'application/pdf',
        logs: [],
      });

      // Create a mock file where name is empty so pop() doesn't give a string but undefined, triggering `|| ''`
      const file = {
        name: '',
        type: 'text/plain',
        size: 9,
        arrayBuffer: async () => new ArrayBuffer(9),
      } as any;

      const result = await converter.convertToPdf(file);

      expect(result).toBeInstanceOf(Blob);
      // Ensure the converter.convert was called with an empty string for the extension format
      expect(mockConvert).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        {
          outputFormat: 'pdf',
          inputFormat: '',
        },
        ''
      );
    });

    it('should gracefully handle files without any dot', async () => {
      mockInitialize.mockResolvedValueOnce(undefined);
      await converter.initialize();

      const outputData = new Uint8Array([1, 2, 3]);
      mockConvert.mockResolvedValueOnce({
        data: outputData,
        mimeType: 'application/pdf',
        logs: [],
      });

      // Create a mock file where name does not have dot
      const file = {
        name: 'nodot',
        type: 'text/plain',
        size: 9,
        arrayBuffer: async () => new ArrayBuffer(9),
      } as any;

      const result = await converter.convertToPdf(file);

      expect(result).toBeInstanceOf(Blob);
      expect(mockConvert).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        {
          outputFormat: 'pdf',
          inputFormat: 'nodot',
        },
        'nodot'
      );
    });
  });

  describe('Helper methods', () => {
    it('should alias wordToPdf, pptToPdf, excelToPdf to convertToPdf', async () => {
      mockInitialize.mockResolvedValueOnce(undefined);
      await converter.initialize();

      const outputData = new Uint8Array([1, 2, 3]);
      mockConvert.mockResolvedValue({
        data: outputData,
        mimeType: 'application/pdf',
      });

      const file = new File(['test data'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await converter.wordToPdf(file);
      await converter.pptToPdf(file);
      await converter.excelToPdf(file);

      expect(mockConvert).toHaveBeenCalledTimes(3);
    });
  });

  describe('destroy', () => {
    it('should destroy the converter and reset initialized flag', async () => {
      mockInitialize.mockResolvedValueOnce(undefined);
      await converter.initialize();

      expect(converter.isReady()).toBe(true);

      mockDestroy.mockResolvedValueOnce(undefined);
      await converter.destroy();

      expect(converter.isReady()).toBe(false);
      expect(mockDestroy).toHaveBeenCalledTimes(1);

      // Should not throw if already destroyed
      await converter.destroy();
    });
  });

  describe('getLibreOfficeConverter', () => {
    it('should return a singleton instance', () => {
      const instance1 = getLibreOfficeConverter();
      const instance2 = getLibreOfficeConverter();
      expect(instance1).toBe(instance2);
    });
  });
});
