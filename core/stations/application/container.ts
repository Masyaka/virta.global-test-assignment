import { DIContainer } from "injecute";
import { parse } from "../../../parser/dsl-parser";
import { applyLanguageTransformations } from "../../../parser/dsl-transformer";
import { interpretateDslScriptCreator } from "../domain/use-cases/interpretate-dsl-script";
import { connect } from "../infrastructure/db/connection";
import { ConnectionConfig } from "../infrastructure/db/connection-config";
import { mappings } from "../infrastructure/db/mappings";
import { StationsRepository } from "./repository";
export const createContainer = () => {
  return new DIContainer()
    .addSingleton(
      "connectionConfig",
      (): ConnectionConfig => ({
        type: "sqlite" as const,
        database: "./db.sqlite",
        logging: true,
      }),
      []
    )
    .addSingleton("dataSourcePromise", (c) => connect(c), ["connectionConfig"])
    .addSingleton("mappings", () => mappings, [])
    .addSingleton(
      "repositoryPromise",
      async (db, mapping) => new StationsRepository(await db, mapping),
      ["dataSourcePromise", "mappings"]
    )
    .addInstance("parseDsl", (input: string) =>
      applyLanguageTransformations(parse(input))
    )
    .fork() // isolate from infrastructure
    .addSingleton(
      "interpretateDslScriptPromise",
      async (parseDsl, repo) =>
        interpretateDslScriptCreator(parseDsl, await repo),
      ["parseDsl", "repositoryPromise"]
    );
};

export type StationsContainer = ReturnType<typeof createContainer>;
