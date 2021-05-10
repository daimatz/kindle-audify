import { GcsLib } from './GcsLib';
import { OcrTask } from './OcrTask';
import { ExtractTextTask } from './ExtractTextTask';
import { TextToSpeechTask } from './TextToSpeechTask';
import { ConcatMp3Task } from './ConcatMp3Task';
const path = require('path');

export type Config = {
  bucket_name: string
  input_pdf_path_regexp: string
  output_path: string
  temp_path: string
  voice_name: string
  language_code: string
  delimiter: string
};

export async function main(gcsPath: string, config: Config) {
  console.log(`gcsPath: ${gcsPath}, config: ${JSON.stringify(config)}`);
  if (!gcsPath.match(new RegExp(config.input_pdf_path_regexp))) {
    console.log(`input path ${gcsPath} doesn't match to RegExp: ${config.input_pdf_path_regexp}`);
    return;
  }

  const gcs = new GcsLib(config.bucket_name);
  const ocr = new OcrTask(gcs);
  const ext = new ExtractTextTask(gcs, config.delimiter);
  const tts = new TextToSpeechTask(gcs, config.voice_name, config.language_code, config.delimiter);
  const concat = new ConcatMp3Task(gcs);

  const basename = path.parse(gcsPath.normalize()).name;
  await ocr.run(gcsPath, `${config.temp_path}/json/${basename}`)
    .then(files => ext.run(files))
    .then(texts => tts.run(texts, `${config.temp_path}/mp3/${basename}`))
    .then(files => concat.run(files, `${config.output_path}/${basename}.mp3`));
}
