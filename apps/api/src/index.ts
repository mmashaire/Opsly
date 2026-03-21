import { createApp } from './server.js';

const port = Number(process.env.PORT ?? 3001);
const app = createApp();

app.listen(port, () => {
  console.log(opsly api listening on http://localhost:);
});
