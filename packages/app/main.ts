import { resolveFileSystemRoutes } from "../../node_modules/framework/dist/dev/resolveFileSystemRoutes";
import fs from "fs/promises";

const code = await resolveFileSystemRoutes({ routesDir: "./src/routes" });
await fs.writeFile("./routes__generated.ts", code);
