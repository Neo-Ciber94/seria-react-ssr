import polka from "polka";
import { handle } from "./core/server/adapters/node/handler";

const PORT = process.env.PORT ?? 5000;
const HOST = process.env.HOST ?? "localhost";
const app = polka();

app.use(handle);
app.listen(PORT, () => {
  console.log(`Listening on http://${HOST}:${PORT}`);
});
