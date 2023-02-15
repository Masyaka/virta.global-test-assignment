require('source-map-support').install();
import { createApp } from './src/app';

createApp().then((app) => {
  process.on('uncaughtException', err => {
    console.error(err);
  });
  app.listen(3000);
  console.log('Listening at 3000');
});

