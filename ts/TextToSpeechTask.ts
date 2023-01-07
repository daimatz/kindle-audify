import { Config } from './Config';
import { GcsLib } from './GcsLib';
const promiseRetry = require('promise-retry');
const TextToSpeech = require('@google-cloud/text-to-speech');

export class TextToSpeechTask {
  private readonly gcs: GcsLib;
  private readonly client: typeof TextToSpeech.TextToSpeechClient;
  private readonly voiceName: string;
  private readonly config: Config;
  private readonly maxLength = 500;

  constructor(gcs: GcsLib, voiceName: string, config: Config) {
    this.gcs = gcs;
    this.client = new TextToSpeech.TextToSpeechClient();
    this.voiceName = voiceName;
    this.config = config;
  }

  run(texts: Array<string>, outputPrefix: string): Promise<Array<string>> {
    console.log(`TextToSpeechTask.run(..., ${outputPrefix})`);
    return this.gcs.listFiles(outputPrefix).then(existFiles => {
      const promises: Array<Promise<string>> = [];

      let num = 0;
      let i = 0;
      while (i < texts.length) {
        const chunk = this.takeChunk(texts, i);
        console.log(chunk);

        const outputPath = this.getOutputPath(outputPrefix, ++num);
        if (existFiles.some(f => f.endsWith(outputPath))) {
          promises.push(Promise.resolve(outputPath));
        } else {
          promises.push(promiseRetry((retry, count) => {
            return this.ttsRequest(chunk[0], outputPath).catch(retry);
          }, { retries: 100, factor: 1.1 }));
        }
        i = chunk[1];
      }
      return Promise.all(promises);
    });
  }

  takeChunk(texts: Array<string>, index: number): [string, number] {
    let text = '';
    for (let i = index; i < texts.length; i++) {
      const t = texts[i];
      if (text.length + t.length > this.maxLength) {
        if (text === '') {
          text = t.substring(0, this.maxLength);
          texts[i] = t.substring(this.maxLength);
        }
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
      input: {
        text: text,
      },
      voice: {
        name: this.voiceName,
        languageCode: this.config.language_code,
        ssmlGender: Math.random() < 0.5 ? 'MALE' : 'FEMALE',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: Number(this.config.speaking_rate) || null,
        pitch: Number(this.config.pitch) || null,
        volumeGainDb: Number(this.config.volume_gain_db) || null,
      },
    };
    return this.client.synthesizeSpeech(request).then(([response]) => {
      return new Promise((resolve, reject) => {
        const w = this.gcs.writeStream(outputPath, 'audio/mpeg');
        w.write(response.audioContent);
        console.log(`ttsRequest(..., ${outputPath}) done.`);
        w.end('', 'binary', () => resolve(outputPath));
      });
    }).catch((e) => {
      console.error(e);
      throw e;
    });
  }
}

