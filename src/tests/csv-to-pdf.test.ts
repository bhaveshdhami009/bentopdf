import { describe, it, expect, vi } from 'vitest';
import { convertCsvToPdf } from '../js/utils/csv-to-pdf';

describe('convertCsvToPdf', () => {
  it('should throw an error for empty CSV', async () => {
    const emptyCsv = '';
    const file = new File([emptyCsv], 'empty.csv', { type: 'text/csv' });
    await expect(convertCsvToPdf(file)).rejects.toThrow('CSV file is empty');
  });

  it('should throw an error when CSV only contains empty rows', async () => {
    const emptyRowsCsv = ' , , \n,,';
    const file = new File([emptyRowsCsv], 'empty_rows.csv', {
      type: 'text/csv',
    });
    await expect(convertCsvToPdf(file)).rejects.toThrow('CSV file is empty');
  });

  it('should successfully convert a valid CSV', async () => {
    const validCsv = 'Name,Age\nAlice,30\nBob,25';
    const file = new File([validCsv], 'valid.csv', { type: 'text/csv' });
    const blob = await convertCsvToPdf(file);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
  });
});
