const fs = require('fs');
const json = fs.readFileSync('/dev/stdin');
const obj = JSON.parse(json);
const ary = obj.responses.map(x => {
  return x.fullTextAnnotation ? x.fullTextAnnotation.pages.map(x => {
    return x.blocks.map(x => {
      return x.paragraphs.map(x => {
        return x.words.map(x => {
          return x.symbols.map(x => x.text);
        });
      });
    });
  }) : [];
});
const texts = ary.flat().flat().flat().map(x => {
  return x.map(x => {
    return x.join("")
  }).flat().join("");
}).map(x => {
  return x.endsWith("。") ? x : (x+"。");
});

// Imports the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');

// Creates a client
const client = new textToSpeech.TextToSpeechClient();

let text = '';
let suffix = 0;
(async () => {
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    if ((text + t).length > 5000 || i === texts.length-1) {
      suffix++;
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
      const filename = `output-${(suffix < 10 ? '00' : (suffix < 100 ? '0' : ''))+suffix}.mp3`;
      fs.writeFileSync(filename, response.audioContent, 'binary');
      console.log(`Audio content written to file: ${filename}`);
      text = '';
    } else {
      text += t;
    }
  }
})();
