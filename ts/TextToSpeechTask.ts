import { GcsLib } from './GcsLib';
const promiseRetry = require('promise-retry');
const PLimit = require('p-limit');
const TextToSpeech = require('@google-cloud/text-to-speech');

export class TextToSpeechTask {
  private readonly gcs: GcsLib;
  private readonly client: typeof TextToSpeech.TextToSpeechClient;
  private readonly voiceName: string;
  private readonly languageCode: string;
  private readonly delimiter: string;
  private readonly maxConcurrency = 8;
  private readonly maxLength = 5000;

  constructor(gcs: GcsLib, voiceName: string, languageCode: string, delimiter: string) {
    this.gcs = gcs;
    this.client = new TextToSpeech.TextToSpeechClient();
    this.voiceName = voiceName;
    this.languageCode = languageCode;
    this.delimiter = delimiter;
  }

  async run(texts: Array<string>, outputPrefix: string): Promise<Array<string>> {
    console.log(`TextToSpeechTask.run(..., ${outputPrefix})`);
    const existFiles = await this.gcs.listFiles(outputPrefix);
    const limit = PLimit(this.maxConcurrency);
    const promises: Array<Promise<string>> = [];

    let num = 0;
    let i = 0;
    while (i < texts.length) {
      const chunk = this.takeChunk(texts, i);

      const outputPath = this.getOutputPath(outputPrefix, ++num);
      promises.push(limit(() => {
        if (existFiles.some(f => f.endsWith(outputPath))) {
          return Promise.resolve(outputPath);
        } else {
          return promiseRetry((retry, count) => {
            if (count > 100) {
              return Promise.reject(`gave up after ${count-1} retry`);
            } else {
              return this.ttsRequest(chunk[0], outputPath).catch(retry);
            }
          });
        }
      }));
      i = chunk[1];
    }
    return Promise.all(promises);
  }

  takeChunk(texts: Array<string>, index: number): [string, number] {
    let text = '';
    for (let i = index; i < texts.length; i++) {
      const t = texts[i];
      if ((text + t).length > this.maxLength) {
        return [text, i];
      }
      text += t;
    }
    return [text, texts.length];
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
      voice: {name: this.voiceName, languageCode: this.languageCode, ssmlGender: 'NEUTRAL'},
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
}

