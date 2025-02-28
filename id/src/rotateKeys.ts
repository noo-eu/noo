import {
  mkdirSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { generateNewKeySet } from "./app/oidc/jwks";

mkdirSync("keys/current", { recursive: true });
mkdirSync("keys/old", { recursive: true });

// Delete all files in keys/old
readdirSync("keys/old").forEach((file) => {
  const filePath = `keys/old/${file}`;
  unlinkSync(filePath);
});

// Move all files from keys/current to keys/old
readdirSync("keys/current").forEach((file) => {
  const oldPath = `keys/current/${file}`;
  const newPath = `keys/old/${file}`;
  renameSync(oldPath, newPath);
});

// Create new keys in keys/current
const keys = await generateNewKeySet();
for (const [key, value] of Object.entries(keys)) {
  const filePath = `keys/current/${key}.json`;
  const fileContent = JSON.stringify(value, null, 2);

  // Write the file
  writeFileSync(filePath, fileContent);
}
