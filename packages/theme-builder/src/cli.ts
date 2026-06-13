#!/usr/bin/env node

import { runThemeCli } from "./cli-runner.js";

const result = await runThemeCli(process.argv.slice(2), {
  commandName: process.env.MDS_THEME_COMMAND_NAME ?? "mds-theme"
});
process.exitCode = result.exitCode;
