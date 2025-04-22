import { readdirSync, readFileSync, writeFileSync } from "fs";
import { parse } from 'csv-parse/sync';
import { hasHeaders, columns, transforms } from "./csv-structure.ts";

const csvs = readdirSync("./raw")
  .filter((fname) => fname.endsWith(".csv"))
  .map((fname) => fname.replace(/\.csv$/, ""));
for (const filename of csvs) {
  const infile = `./raw/${filename}.csv`;
  const outfile = `./public/${filename}.json`;
  const csvData = readFileSync(infile).toString();
  const rows = parse(csvData, {columns});
  if (hasHeaders) {
    rows.splice(0, 1);
  }
  for (const row of rows) {
    for(const key in transforms){
      row[key] = transforms[key](row[key]);
    }
  }
  const itemStrings = rows.map((obj) => JSON.stringify(obj));
  const outData = `[${itemStrings.join(",")}]`;
  writeFileSync(outfile, outData);
}
