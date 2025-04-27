import { readdirSync, readFileSync, writeFileSync } from "fs";
import { parse } from 'csv-parse/sync';
import { config } from "./csv-structure.ts";

const csvs = readdirSync("./raw")
  .filter((fname) => fname.endsWith(".csv"))
  .map((fname) => fname.replace(/\.csv$/, ""));
for (const filename of csvs) {
  const infile = `./raw/${filename}.csv`;
  const outfile = `./public/${filename}.json`;
  const csvData = readFileSync(infile).toString();
  const rows = parse(csvData, {columns: Array.from(config.columnsIn)});
  if (config.hasHeaders) {
    rows.splice(0, 1);
  }
  rows.forEach((row, idx) => {
    if(config.prefilter && !config.prefilter(row)){
      rows[idx] = null;
      return;
    }
    for(const key in config.transforms){
      row[key] = config.transforms[key](row[key]);
    }
    if(config.filter && !config.filter(row)){
      rows[idx] = null;
    }
  })
  const itemStrings = rows.filter(r => r !== null).map((obj) => {
    if(config.columnsOut === undefined){
      return JSON.stringify(obj);
    }
    const outObj = {};
    for(const key of config.columnsOut){
      outObj[key] = obj[key];
    }
    return JSON.stringify(outObj);
  });
  const outData = `[${itemStrings.join(",")}]`;
  writeFileSync(outfile, outData);
}
