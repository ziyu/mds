#!/usr/bin/env node

import { cac } from "cac";

const cli = cac("mds");

cli
  .command("build <input>", "Compile an MDS file to HTML")
  .option("-o, --output <path>", "Output HTML path")
  .action((input: string) => {
    console.log(`MDS build is not implemented yet: ${input}`);
  });

cli.command("ast <input>", "Print the MDS AST").action((input: string) => {
  console.log(`MDS ast is not implemented yet: ${input}`);
});

cli.command("check <input>", "Check an MDS file").action((input: string) => {
  console.log(`MDS check is not implemented yet: ${input}`);
});

cli.help();
cli.parse();
