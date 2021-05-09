import { GcsLib } from './GcsLib';
import { OcrTask } from './OcrTask';
import { ExtractTextTask } from './ExtractTextTask';
import { TextToSpeechTask } from './TextToSpeechTask';
import { ConcatMp3Task } from './ConcatMp3Task';

export async function main(gcsPath: string) {
  const gcs = new GcsLib('pdf-audify');
  const ocr = new OcrTask(gcs);
  const ext = new ExtractTextTask(gcs, '。');
  const tts = new TextToSpeechTask(gcs, 'ja-JP-Standard-A', 'ja-JP', '。');
  const concat = new ConcatMp3Task(gcs);

  const basename = require('path').basename(gcsPath.normalize(), '.pdf');
  await ocr.run(gcsPath, `dev/json/${basename}`)
   .then(files => ext.run(files))
   .then(texts => tts.run(texts, `dev/mp3/${basename}`))
   .then(files => concat.run(files, `dev/out/${basename}.mp3`));
}
