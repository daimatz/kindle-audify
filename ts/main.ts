import { Config } from './Config';
import { GcsLib } from './GcsLib';
import { OcrTask } from './OcrTask';
import { ExtractTextTask } from './ExtractTextTask';
import { TextToSpeechTask } from './TextToSpeechTask';
import { ConcatMp3Task } from './ConcatMp3Task';
const promiseRetry = require('promise-retry');
const path = require('path');

export function main(gcsPath: string, config: Config): Promise<void> {
  console.log(`gcsPath: ${gcsPath}, config: ${JSON.stringify(config)}`);
  if (!gcsPath.match(new RegExp(config.input_pdf_path_regexp))) {
    console.log(`input path ${gcsPath} doesn't match to RegExp: ${config.input_pdf_path_regexp}`);
    return;
  }

  const voice_names = config.voice_name.split(',');
  const index = Math.floor(Math.random()*voice_names.length);
  const voice_name = voice_names[index].trim();

  const gcs = new GcsLib(config.bucket_name);
  const ocr = new OcrTask(gcs);
  const ext = new ExtractTextTask(gcs, config.delimiter);
  const tts = new TextToSpeechTask(gcs, voice_name, config);
  const concat = new ConcatMp3Task(gcs);

  const basename = path.parse(gcsPath.normalize()).name;
  const timestamp = new Date().getTime();
  const dt = new Date(timestamp).toISOString().replace(/T.+$/, '').replaceAll('-', '');
  const working_dir = `${config.temp_path}/${timestamp}_${basename}`;
  return promiseRetry((retry, count) => {
    return ocr.run(gcsPath, `${working_dir}/json`)
      .then(files => ext.run(files, `${working_dir}/text`))
      .then(texts => tts.run(texts, `${working_dir}/mp3`))
      .then(files => concat.run(files, `${config.output_path}/${dt}_${basename}.mp3`))
      .then(() => void(0));
  }, { retries: 3, factor: 1 });
}
