import parse from "csv-parse/lib/sync";
import fs from "fs";
import path from "path";
import sha256 from "crypto-js/sha256";
import { enc } from "crypto-js";

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
  cases: string;
  deaths: string;
}

export interface IDataStore {
  locales: Array<ILocale>;
  localesByName: (name: string) => Array<ILocale>;
  recordsByLocale: (localeId: string) => Array<IRecord>;
}

function compact<T>(arr: Array<T | null | undefined>): T[] {
  return arr.reduce((memo, item) => {
    if (item == null) {
      return memo;
    }

    return memo.concat([item]);
  }, [] as Array<T>);
}

function urlSafeSha256(value: string) {
  return sha256(value)
    .toString(enc.Base64)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function hash(record: any) {
  let stringifiedRecord: string;

  try {
    stringifiedRecord = JSON.stringify(record);
  } catch (err) {
    // TODO: handle error better
    throw "💥";
  }

  return urlSafeSha256(stringifiedRecord);
}

function fetchData(): IDataStore {
  const csv = fs.readFileSync(
    path.join(__dirname, "../../covid-19-data/us-counties.csv")
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
    cases: record.cases,
    deaths: record.deaths
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

const fetchedData = fetchData();

export class Context {
  data = fetchedData;
}
