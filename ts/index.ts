import { main } from './main';

exports.PdfAudify = (file, context) => {
  console.log(JSON.stringify(context));
  console.log(JSON.stringify(file));
  if (file.name.match(/\.pdf$/)) {
    main(file.name);
  }
};
