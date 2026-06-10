const title1 = "þÿ\x00H\x00e\x00l\x00l\x00o";
console.log(title1.startsWith("þÿ"));
console.log(title1.charCodeAt(0), title1.charCodeAt(1));

function decodeTitle(title) {
  if (title.startsWith("þÿ")) {
    let result = '';
    for (let i = 2; i < title.length; i += 2) {
      const high = title.charCodeAt(i);
      const low = title.charCodeAt(i+1) || 0;
      result += String.fromCharCode((high << 8) + low);
    }
    return result;
  }
  return title;
}
console.log(decodeTitle(title1));
