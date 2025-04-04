#!/usr/bin/env bun

import { fixDirectories } from "./common";
import { loadLanguages } from "./loadLanguages";
import { getLLMClient } from "./models";
import { move } from "./move";
import { remove } from "./remove";
import { show } from "./show";
import { checkMissing } from "./checkMissing";
import { translateMissing } from "./translateMissing";

const { program } = require("commander");

const languages = await loadLanguages();

await fixDirectories(languages);

program
  .name("i18n-utils")
  .description("noo's utilities to manage translation files");

program
  .command("mv")
  .description("Rename or move a translation key")
  .argument("<dir>", "The directory where the original key is located")
  .argument("<key>", "The key to rename or move")
  .argument("<newKey>", "The new key, can be the same as the original key")
  .option(
    "-d, --destination <dir>",
    "The directory where the new key will be located",
  )
  .action(
    (
      dir: string,
      key: string,
      newKey: string,
      options: { destination?: string },
    ) => {
      const destination = options.destination || dir;
      move(languages, dir, key, destination, newKey);
    },
  );

program
  .command("rm")
  .description("Remove a translation key")
  .argument("<dir>", "The directory where the key is located")
  .argument("<key>", "The key to remove")
  .action((dir: string, key: string) => {
    remove(languages, dir, key);
  });

program
  .command("show")
  .description("Show the value of a translation key across all locales")
  .argument("<dir>", "The directory where the key is located")
  .argument("<key>", "The key to show")
  .action((dir: string, key: string) => {
    show(languages, dir, key);
  });

program
  .command("translate-missing")
  .description("Translate all missing keys in all locales, using LLMs")
  .option(
    "--api <api>",
    "The API to use for translation (ollama - default, openai)",
  )
  .option(
    "--model <model>",
    "The model to use for translation (llama3.1 - ollama default, gpt-4o-mini - openai default, any others)",
  )
  .action((options: { api?: string; model?: string }) => {
    const api = options.api || "ollama";
    const model =
      options.model || (api === "ollama" ? "llama3.1" : "gpt-4o-mini");
    const client = getLLMClient(api, model);

    translateMissing(languages, client);
  });

program
  .command("check-missing")
  .description(
    "Check for missing keys in all locales, failing if any are found",
  )
  .action(async () => {
    const anyMissing = await checkMissing(languages);
    if (anyMissing) {
      process.exit(1);
    } else {
      console.log("All keys are present in all locales. Good job!");
    }
  });

program.parse();
