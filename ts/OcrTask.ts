import { GcsLib } from './GcsLib';
const PLimit = require('p-limit');
const ImageAnnotatorClient = require('@google-cloud/vision').v1.ImageAnnotatorClient;

export class OcrTask {
  private readonly gcs: GcsLib;
  private readonly client: typeof ImageAnnotatorClient;

  constructor(gcs: GcsLib) {
    this.gcs = gcs;
    this.client = new ImageAnnotatorClient();
  }

  run(inputFilePath: string, outputPrefix: string): Promise<Array<string>> {
    console.log(`OcrTask.run(${inputFilePath}, ${outputPrefix})`);
    return this.gcs.listFiles(outputPrefix).then(listFiles => {
      if (listFiles.length > 0) {
        const res = listFiles.sort((a, b) => this.ord(a) - this.ord(b));
        console.log(`already exists: ${res}`);
        return res;
      } else {
        // const outputPrefix = 'json/' + path.basename(fileName, '.pdf')
        const gcsSourceUri = `gs://${this.gcs.getBucketName()}/${inputFilePath}`;
        const gcsDestinationUri = `gs://${this.gcs.getBucketName()}/${outputPrefix}/`;
        const inputConfig = {
          mimeType: 'application/pdf',
          gcsSource: { uri: gcsSourceUri },
        };
        const outputConfig = { gcsDestination: { uri: gcsDestinationUri } };
        const features = [{type: 'DOCUMENT_TEXT_DETECTION'}];
        const request = {
          requests: [{
            inputConfig: inputConfig,
            features: features,
            outputConfig: outputConfig,
          }],
        };
        return this.client.asyncBatchAnnotateFiles(request).then(([operation]) => {
          return operation.promise();
        }).then(([res]) => {
          const destinationUri = res.responses[0].outputConfig.gcsDestination.uri;
          console.log('json saved to: ' + destinationUri);
          return this.gcs.listFiles(outputPrefix)
            .then(files => files.sort((a, b) => this.ord(a) - this.ord(b)));
        });
      }
    });
  }
  ord(name: string): number {
    const basename = require('path').basename(name);
    return parseInt(basename.replace(/^.*?-([0-9]+)-.*$/, '$1'), 10);
  }
}
