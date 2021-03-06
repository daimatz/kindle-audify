import { GcsLib } from './GcsLib';

export class ExtractTextTask {
  private readonly gcs: GcsLib;
  private readonly delimiter: string;
  private readonly maxConcurrency = 4;

  constructor(gcs: GcsLib, delimiter: string) {
    this.gcs = gcs;
    this.delimiter = delimiter;
  }

  run(gcsPaths: Array<string>, outputPathPrefix: string): Promise<Array<string>> {
    console.log(`ExtractTextTask.run(${JSON.stringify(gcsPaths)}`);
    const promises = gcsPaths.map(path => this.readOcrOuputJson(path));
    return Promise.all(promises).then((textsList: Array<Array<string>>) => {
      return this.saveToGcs(textsList, outputPathPrefix).then(() => textsList.flat());
    });
  }

  readOcrOuputJson(gcsPath: string): Promise<Array<string>> {
    console.log(`ExtractTextTask.readOcrOuputJson(${gcsPath})`);
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

    const res = [];
    let t = '';
    for (let c of texts.join('')) {
      t += c;
      if (c === this.delimiter) {
        res.push(t);
        t = '';
      }
    }
    res.push(t);
    return res;
  }

  saveToGcs(textsList: Array<Array<string>>, outputPathPrefix: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const w = this.gcs.writeStream(`${outputPathPrefix}/output.txt`, 'text/plain');
      w.on('error', e => reject(e));
      textsList.forEach(texts => {
        texts.forEach(text => {
          w.write(text);
        });
        w.write("\n\n\n");
      });
      w.end();
      resolve();
    });
  }
}
