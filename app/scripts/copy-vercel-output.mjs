import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const output = resolve(".vercel/output");
if (!existsSync(resolve(output, "config.json"))) throw new Error("Vercel output was not generated");
cpSync(output, resolve("../.vercel/output"), { recursive: true });
