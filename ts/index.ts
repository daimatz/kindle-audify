import { Config } from './Config';
import { main } from './main';

exports.PdfAudify = async (file, context) => {
  await main(file.name, process.env as unknown as Config);
};
