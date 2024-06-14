import { resolveFileSystemRoutes } from "../../node_modules/framework/dist/dev/resolveFileSystemRoutes";
import fs from "fs/promises";
import * as prettier from "prettier";

const code = await resolveFileSystemRoutes({
  routesDir: "./src/routes",
});

const formatted = await prettier.format(code, { filepath: "$routes.ts" });
await fs.writeFile("./routes__generated.ts", formatted);
