import fs from "fs";
import path from "path";
import { projectRoot } from "./common";

export async function loadLanguages() {
  const root = await projectRoot();
  const configPath = path.join(root, "src/i18n/index.ts");

  if (!fs.existsSync(configPath)) {
    console.error("Could not find i18n config file at", configPath);
    process.exit(1);
  }

  const module = require(configPath);
  if ("SUPPORTED_LANGUAGES" in module) {
    return module.SUPPORTED_LANGUAGES;
  }

  console.error("Could not find SUPPORTED_LANGUAGES in", configPath);
  process.exit(1);
}
