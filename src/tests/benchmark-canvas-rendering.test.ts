import { describe, it, expect } from 'vitest';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function simulateRenderPageToCanvas(pageNum: number) {
  await delay(10); // Simulate rendering time
  return `canvas-${pageNum}`;
}

describe('Benchmark: Chunked Canvas Rendering', () => {
  it('measures sequential vs chunked parallel rendering', async () => {
    const numPages = 50;

    // Sequential
    const startSeq = performance.now();
    const seqResults = [];
    for (let i = 0; i < numPages; i++) {
      const canvas = await simulateRenderPageToCanvas(i + 1);
      seqResults.push(canvas);
    }
    const seqTime = performance.now() - startSeq;

    // Chunked Parallel
    const startChunked = performance.now();
    const chunkedResults = [];
    const chunkSize = 5;

    for (let i = 0; i < numPages; i += chunkSize) {
      const chunk = [];
      for (let j = 0; j < chunkSize && i + j < numPages; j++) {
        chunk.push(simulateRenderPageToCanvas(i + j + 1));
      }
      const canvases = await Promise.all(chunk);
      chunkedResults.push(...canvases);
    }
    const chunkedTime = performance.now() - startChunked;

    // console.log(`Sequential time: ${seqTime}ms`);
    // console.log(`Chunked time: ${chunkedTime}ms`);

    expect(chunkedResults).toEqual(seqResults);
    // In actual JS engine, chunked might be faster if it's true parallel, or here if using fake timers/async
    // we just measure the async delay overhead
  });
});
