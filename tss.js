const fs = require('fs');
const json = fs.readFileSync('/dev/stdin');
const obj = JSON.parse(json);
const ary = obj.responses.map(x => {
  return x.fullTextAnnotation.pages.map(x => {
    return x.blocks.map(x => {
      return x.paragraphs.map(x => {
        return x.words.map(x => {
          return x.symbols.map(x => x.text);
        });
      });
    });
  });
});
const texts = ary.flat().flat().flat().map(x => {
  return x.map(x => {
    return x.join("")
  }).flat().join("");
}).map(x => {
  return x.endsWith("。") ? x : (x+"。");
});
console.log(texts.join("\n").substring(0, 5000));
process.exit(1);

// Imports the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');

// Creates a client
const client = new textToSpeech.TextToSpeechClient();

const mp3_files = [];
let text = '';
let suffix = 0;
for (let i = 0; i < texts.length; i++) {
  const t = texts[i];
  if ((text + t).length > 5000 || i === texts.length-1) {
    (async () => {
      // The text to synthesize
      // Construct the request
      const request = {
        input: {text: text},
        // Select the language and SSML voice gender (optional)
        voice: {languageCode: 'ja-JP', ssmlGender: 'NEUTRAL'},
        // select the type of audio encoding
        audioConfig: {audioEncoding: 'MP3'},
      };

      // Performs the text-to-speech request
      const [response] = await client.synthesizeSpeech(request);
      // Write the binary audio content to a local file
      suffix++;
      const filename = `output-${(suffix < 10 ? '00' : (suffix < 100 ? '0' : ''))+suffix}.mp3`;
      fs.writeFileSync(filename, response.audioContent, 'binary');
      mp3_files.push(filename);
      console.log(`Audio content written to file: ${filename}`);
    })();
    text = '';
  } else {
    text += t;
  }
}

const concatstream = require('mp3-concat');
var concatenater = concatstream();
concatenater.pipe(fs.createWriteStream('concat.mp3'));
async.eachSeries(mp3_files, (file, cb) => {
  fs.createReadStream(file).on('end', cb).pipe(concatenater, { end: false });
}, () => {
  concatenater.end();
});
