import { GcsLib } from './GcsLib';
const PLimit = require('p-limit');

export class ConcatMp3Task {
  private readonly gcs: GcsLib;
  private readonly maxConcurrency = 4;
  private readonly maxCombine = 32;

  constructor(gcs: GcsLib) {
    this.gcs = gcs;
  }
  run(files: Array<string>, outputPath: string): Promise<string> {
    console.log(`ConcatMp3Task.run(${JSON.stringify(files)}, ${outputPath})`);
    if (files.length === 0) {
      return Promise.reject('files are empty');
    }
    if (files.length === 1) {
      return this.gcs.copy(files[0], outputPath).then(() => outputPath);
    }
    const limit = PLimit(this.maxConcurrency);
    const promises: Array<Promise<string>> = [];
    for (let i = 0; i < files.length; i+=this.maxCombine) {
      const group = files.slice(i, i+this.maxCombine);
      const concatFilePath = this.getConcatFilePath(group);
      promises.push(limit(() => {
        return this.gcs.combine(group, concatFilePath, { contentType: 'audio/mpeg' }).then(() => concatFilePath);
      }));
    }
    return Promise.all(promises).then(newFiles => {
      return this.run(newFiles, outputPath)
    });
  }
  getConcatFilePath(files: Array<string>): string {
    const dir = require('path').dirname(files[0]);
    const s = files[0].replace(/^.*?-([0-9]{3}).*$/, '$1');
    const e = files.slice(-1)[0].replace(/^.*([0-9]{3})\.mp3$/, '$1');
    return `${dir}/concat-${s}-${e}.mp3`;
  }
}

