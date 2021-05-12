import { Readable, Writable } from 'stream';
import { Bucket, Storage } from '@google-cloud/storage';

export class GcsLib {
  private readonly bucket: Bucket;
  private readonly bucketName: string;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
    this.bucket = new Storage().bucket(bucketName);
  }
  getBucketName(): string {
    return this.bucketName;
  }
  listFiles(prefix: string): Promise<Array<string>> {
    return this.bucket.getFiles({prefix, maxResults: 1000}).then(([files]) => {
      return files.map(f => f.name);
    });
  }
  writeStream(path: string, contentType: string): Writable {
    return this.bucket
      .file(path)
      .createWriteStream({
        metadata: { contentType },
      })
  }
  writeGcsFileString(content: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.writeStream(path, 'text/plain').end(content);
      resolve();
    });
  }
  readStream(path: string): Readable {
    return this.bucket
      .file(path)
      .createReadStream();
  }
  readGcsFileString(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let buf = '';
      this.readStream(path)
        .on('data', d => { buf += d; })
        .on('end', () => resolve(buf))
        .on('error', e => reject(e));
    });
  }
  combine(sourcePaths: Array<string>, destPath: string, metadata: Object = {}): Promise<void> {
    return this.bucket.combine(sourcePaths, destPath)
      .then(() => { return this.bucket.file(destPath).setMetadata(metadata); })
      .then(() => { return; });
  }
  copy(sourcePath: string, destPath: string): Promise<void> {
    return this.bucket.file(sourcePath).copy(this.bucket.file(destPath))
      .then(() => { return; });
  }
}

