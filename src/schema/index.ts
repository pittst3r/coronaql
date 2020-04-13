import {
  objectType,
  interfaceType,
  queryType,
  stringArg,
  enumType,
  intArg,
  arg,
  makeSchema,
  scalarType,
  connectionPlugin,
  idArg
} from "@nexus/schema";
import { GraphQLDate } from "graphql-iso-date";
import * as path from "path";
import { connectionFromArray } from "graphql-relay";

const Node = interfaceType({
  name: "Node",
  definition(t) {
    t.id("id", { description: "Unique identifier for the resource" });
    t.resolveType(() => null);
  }
});

const Date = scalarType({ ...GraphQLDate, name: "Day" });

const LocaleKind = enumType({
  name: "LocaleKind",
  members: ["COUNTY", "STATE", "COUNTRY"]
});

const Locale = objectType({
  name: "Locale",
  definition(t) {
    t.implements(Node);
    t.field("kind", {
      type: LocaleKind
    });
    t.string("name");
    t.connectionField("records", {
      type: Record,
      async resolve(root, args, { cache, store }, info) {
        return cache.fetch(
          ["locale records", root.id, args],
          () => connectionFromArray(store.recordsByLocale(root.id), args) as any
        );
      }
    });
    t.list.field("subdivisions", {
      type: Locale
    });
  }
});

const Record = objectType({
  name: "Record",
  definition(t) {
    t.implements(Node);
    t.field("date", {
      type: Date
    });
    t.int("cases");
    t.int("deaths");
  }
});

const Query = queryType({
  definition(t) {
    t.list.field("locales", {
      type: Locale,
      nullable: true,
      args: {
        name: stringArg({ nullable: true })
      },
      async resolve(root, args, { store }, info) {
        return args.name ? store.localesByName(args.name) : store.locales;
      }
    });
  }
});

export const schema = makeSchema({
  plugins: [connectionPlugin()],
  types: [Query, Node, Date, Locale, LocaleKind],
  typegenAutoConfig: {
    contextType: "ctx.Context",
    sources: [
      {
        alias: "ctx",
        source: path.join(__dirname, "..", "context.ts")
      }
    ]
  },
  outputs: {
    schema: path.join(__dirname, "generated/schema.gen.graphql"),
    typegen: path.join(__dirname, "generated/nexusTypes.gen.ts")
  }
});
