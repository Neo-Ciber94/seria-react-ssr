import express from "express";
import { handle } from "./core/server/adapters/node";

const PORT = process.env.PORT ?? 5000;
const HOST = process.env.HOST ?? "localhost";

const app = express();
app.use(handle);

app.listen(PORT, () => {
  console.log(`Listening on http://${HOST}:${PORT}`);
});
