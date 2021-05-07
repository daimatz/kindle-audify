import { GcsLib } from './GcsLib';
const promiseRetry = require('promise-retry');
const PLimit = require('p-limit');
const TextToSpeech = require('@google-cloud/text-to-speech');

export class TextToSpeechTask {
  private readonly gcs: GcsLib;
  private readonly client: typeof TextToSpeech.TextToSpeechClient;
  private readonly languageCode: string;
  private readonly delimiter: string;
  private readonly maxConcurrency = 8;
  private readonly maxLength = 5000;

  constructor(gcs: GcsLib, languageCode: string, delimiter: string) {
    this.gcs = gcs;
    this.client = new TextToSpeech.TextToSpeechClient();
    this.languageCode = languageCode;
    this.delimiter = delimiter;
  }

  async run(gcsPaths: Array<string>, outputPrefix: string): Promise<Array<string>> {
    console.log(`TextToSpeechTask.run(${JSON.stringify(gcsPaths)}, ${outputPrefix})`);
    const existFiles = await this.gcs.listFiles(outputPrefix);
    const textsList = await Promise.all(gcsPaths.map(paths => this.readOcrOuputJson(paths)));
    const texts = textsList.flat();
    let text = '';
    let num = 0;
    const limit = PLimit(this.maxConcurrency);
    const promises: Array<Promise<string>> = [];
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      if ((text + t).length > this.maxLength) {
        const outputPath = this.getOutputPath(outputPrefix, ++num);
        const chunk = JSON.parse(JSON.stringify(text));
        promises.push(limit(() => {
          if (existFiles.some(f => f.endsWith(outputPath))) {
            return Promise.resolve(outputPath);
          } else {
            return promiseRetry((retry, count) => {
              if (count > 5) {
                return Promise.reject(`gave up after ${count-1} retry`);
              } else {
                return this.ttsRequest(chunk, outputPath).catch(retry);
              }
            });
          }
        }));
        text = '';
      }
      text += t;
    }
    if (text.length > 0) {
      const outputPath = this.getOutputPath(outputPrefix, ++num);
      const chunk = JSON.parse(JSON.stringify(text));
      promises.push(limit(() => {
        if (existFiles.some(f => f.endsWith(outputPath))) {
          return Promise.resolve(outputPath);
        } else {
          return promiseRetry((retry, count) => {
            if (count > 5) {
              return Promise.reject(`gave up after ${count-1} retry`);
            } else {
              return this.ttsRequest(chunk, outputPath).catch(retry);
            }
          });
        }
      }));
    }
    return Promise.all(promises);
  }

  getOutputPath(prefix: string, num: number): string {
    const suffixString = `${(num < 10 ? '00' : (num < 100 ? '0' : ''))+num}`;
    const outputPath = `${prefix}/output-${suffixString}.mp3`;
    return outputPath;
  }

  ttsRequest(text: string, outputPath: string): Promise<string> {
    console.log(`ttsRequest(..., ${outputPath})`);
    const request = {
      input: {text: text},
      voice: {languageCode: this.languageCode, ssmlGender: 'NEUTRAL'},
      audioConfig: {audioEncoding: 'MP3'},
    };
    return this.client.synthesizeSpeech(request).then(([response]) => {
      return new Promise((resolve, reject) => {
        const w = this.gcs.writeStream(outputPath, 'audio/mpeg');
        w.write(response.audioContent);
        console.log(`ttsRequest(..., ${outputPath}) done.`);
        w.end('', 'binary', () => resolve(outputPath));
      });
    });
  }

  readOcrOuputJson(gcsPath: string): Promise<Array<string>> {
    console.log(`TextToSpeechTask.readOcrOuputJson(${gcsPath})`);
    return this.gcs.readGcsFileString(gcsPath).then(str => {
      const obj = JSON.parse(str) as OcrResult.Root;
      return this.splitSentences(obj);
    }).then(sentencesList => sentencesList.flat());
  }

  splitSentences(result: OcrResult.Root): Array<string> {
    const pages: Array<Array<WordLevelText>> = [];
    result.responses.forEach(a => {
      if (a.fullTextAnnotation) {
        a.fullTextAnnotation.pages.forEach(b => {
          const words = [];
          b.blocks.forEach(c => {
            c.paragraphs.forEach(d => {
              d.words.forEach(e => {
                words.push({
                  boundingBox: e.boundingBox,
                  text: e.symbols.map(f => f.text).join(''),
                });
              });
            });
          });
          pages.push(words);
        });
      }
    });
    const texts: Array<string> = [];
    pages.forEach(words => {
      const ymax = Math.max(...words.map(w => w.boundingBox.normalizedVertices.map(p => p.y)).flat());
      for (let i = 0; i < words.length; i++) {
        const text = words[i].text;
        if (i < words.length-1) {
          const currentYs = words[i].boundingBox.normalizedVertices.map(p => p.y);
          const nextYs = words[i+1].boundingBox.normalizedVertices.map(p => p.y);
          texts.push(
            (currentYs.every(y => y < ymax * 0.9) && Math.min(...nextYs) < Math.max(...currentYs))
            ? (text+this.delimiter): text
          );
        }
      }
    });
    return texts.join('').split(this.delimiter).filter(x => x !== '').map(x => {
      return x.endsWith(this.delimiter) ? x : (x+this.delimiter);
    });
  }
}

