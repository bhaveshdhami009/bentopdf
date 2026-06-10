function decodePdfTitle(title) {
  if (typeof title !== 'string') return title;

  // Sometimes PDF text comes in with UTF-16BE BOM marker: FE FF (or \xFE\xFF, which is þÿ)
  if (title.startsWith('\xFE\xFF') || title.startsWith('þÿ')) {
    let result = '';
    // Skip the BOM marker (2 chars)
    for (let i = 2; i < title.length; i += 2) {
      const high = title.charCodeAt(i);
      const low = i + 1 < title.length ? title.charCodeAt(i + 1) : 0;
      result += String.fromCharCode((high << 8) | low);
    }
    title = result;
  }
  // Another potential issue is the euro symbol being used as space
  else if (title.includes('€') && !title.includes(' ')) {
    title = title.replace(/€/g, ' ');
  }

  // Remove control characters and trim
  return title.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
}

console.log(decodePdfTitle("þÿ\x00H\x00e\x00l\x00l\x00o"));
console.log(decodePdfTitle("Chapter€1"));
console.log(decodePdfTitle("Price is 50€"));
