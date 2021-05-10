import { main, Config } from './main';

exports.PdfAudify = async (file, context) => {
  console.log('file: ' + file.name);
  if (file.name.match(/\.pdf$/)) {
    await main(file.name, process.env as Config);
  }
};
