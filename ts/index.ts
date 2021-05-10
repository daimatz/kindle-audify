import { main, Config } from './main';

exports.PdfAudify = async (file, context) => {
  await main(file.name, process.env as Config);
};
