import { createApp } from "./index";

const DEFAULT_PORT = 3000;

const app = createApp();
const port = Number(process.env.PORT) || DEFAULT_PORT;

app.listen(port, () => {
  console.log(`Opsly API is running on http://localhost:${port}`);
});
