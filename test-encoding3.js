// Another encoding for UTF-16BE could be PDFDocEncoding which pdfjs-dist handles most of the time.
// But some old PDFs might have UTF-16 strings encoded weirdly, or euro symbol issues.

// It seems the euro replacement and control char strip is what the original author wanted.
function cleanTitle(title) {
  if (typeof title === 'string') {
    let result = title;

    // Sometimes UTF-16BE is interpreted incorrectly and starts with 'þÿ' (0xFE 0xFF)
    if (result.startsWith('\xFE\xFF') || result.startsWith('þÿ')) {
      let decoded = '';
      for (let i = 2; i < result.length; i += 2) {
        const high = result.charCodeAt(i);
        const low = i + 1 < result.length ? result.charCodeAt(i + 1) : 0;
        decoded += String.fromCharCode((high << 8) | low);
      }
      result = decoded;
    }

    if (result.includes('€') && !result.includes(' ')) {
      result = result.replace(/€/g, ' ');
    }

    return result.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
  }
  return title;
}

console.log(cleanTitle("Hello\x1F World"));
console.log(cleanTitle("Section€1"));
console.log(cleanTitle("þÿ\x00H\x00i"));
