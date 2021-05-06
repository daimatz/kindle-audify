const fs = require('fs');
const output = fs.createWriteStream('./output.mp3');

let files = process.argv.slice(2);
let stream;
function main() {
  if (!files.length) {
    output.end("Done");
    return;
  }
  const currentfile = files.shift();
  stream = fs.createReadStream(currentfile);
  stream.pipe(output, {end: false});
  stream.on("end", function() {
    console.log(currentfile + ' appended');
    main();
  });
}
main();
