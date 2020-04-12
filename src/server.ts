import { ApolloServer } from "apollo-server-express";
import { schema } from "./schema";
import express from "express";
import { Context } from "./context";

const app = express();
const port = 3000;

const server = new ApolloServer({
  schema,
  context: () => new Context()
});

server.applyMiddleware({ app });

app.listen({ port }, () => {
  console.log(`🚀 Server ready at http://localhost:${port}`);
  console.log(`🐒 Playground ready at http://localhost:${port}/graphql`);
});
