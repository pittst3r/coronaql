import parse from "csv-parse/lib/sync";
import fs from "fs";
import path from "path";
import { hash, Cache, compact } from "./utils";

interface ISourceRecord {
  date: string;
  county: string;
  state: string;
  fips: string;
  cases: string;
  deaths: string;
}

export interface ILocale {
  id: string;
  fips: number;
  name: string;
  kind: "COUNTY" | "STATE" | "COUNTRY";
  subdivisions: Array<ILocale>;
}

export interface IRecord {
  id: string;
  localeId: string;
  date: string;
  cases: number;
  deaths: number;
}

export interface IDataStore {
  locales: Array<ILocale>;
  localesByName: (name: string) => Array<ILocale>;
  recordsByLocale: (localeId: string) => Array<IRecord>;
}

function fetchData(): IDataStore {
  const csv = fs.readFileSync(
    path.join(__dirname, "../data/nyt-us/us-counties.csv")
  );
  const source: Array<ISourceRecord> = parse(csv, {
    columns: true
  });
  const locales = source
    .map<ILocale>(record => ({
      id: hash([record.county, record.state, record.fips]),
      fips: parseInt(record.fips),
      name: `${record.county}, ${record.state}`,
      kind: "COUNTY",
      subdivisions: []
    }))
    .reduce(
      (memo, record) =>
        memo.map(({ id }) => id).includes(record.id)
          ? memo
          : memo.concat(record),
      [] as Array<ILocale>
    )
    .sort((l, r) => l.fips - r.fips);
  const records = source.map<IRecord>(record => ({
    id: hash([record.date, record.fips]),
    localeId: hash([record.county, record.state, record.fips]),
    date: record.date,
    cases: parseInt(record.cases),
    deaths: parseInt(record.deaths)
  }));

  const recordsByLocale = (localeId: string) =>
    records
      .filter(record => record.localeId === localeId)
      .sort((l, r) => Date.parse(l.date) - Date.parse(r.date));

  const localesByName = (name: string) =>
    compact([locales.find(locale => locale.name === name)]);

  return {
    locales,
    localesByName,
    recordsByLocale
  };
}

export class Context {
  store = fetchData();
  cache = new Cache();
}
