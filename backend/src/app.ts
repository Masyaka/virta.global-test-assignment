import bodyParser from "body-parser";
import express, { Handler, Request, Response } from "express";
import { createContainer } from "../../core/stations/application/container";
import { mountResource } from "./mount-resource";
import { useRoutes } from "./router";

// todo: user swagger for documenting
export const createApp = async () => {
  const container = createContainer().fork().addInstance("logger", console);
  const repo = await container.get("repositoryPromise");
  const app = express();
  app.use(bodyParser.json({ type: "application/json" }));
  app.use(bodyParser.text({ type: "text/plain" }));
  mountResource(app, "Station", "/api/stations", repo);
  mountResource(app, "StationType", "/api/station-types", repo);
  mountResource(app, "Company", "/api/companies", repo, { omit: ["nodeId"] });
  useRoutes(app, [
    [
      "get",
      "/api/companies/:id/stations",
      async (req, res) => {
        res.json(await repo.getCompanyStations(Number(req.params.id)));
      },
    ],
    [
      "post",
      "/api/companies/:id/set-parent",
      async (req, res) => {
        res.json(
          await repo.setCompanyParent(Number(req.params.id), req.body.parentId)
        );
      },
    ],
    [
      "post",
      "/api/dsl",
      async (req, res) => {
        const interpretate = await container.get(
          "interpretateDslScriptPromise"
        );
        const result = await interpretate(req.body, new Date());
        result.data = result.data.filter((s) => !s.step.startsWith("Wait "));
        res.send(result);
      },
    ],
  ]);

  app.use((err: any, req: Request, res: Response, next: Handler) => {
    container.get("logger").error(err);
    res.status(500).send(err.message);
  });
  return app;
};
