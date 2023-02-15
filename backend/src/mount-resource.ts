import { Express } from "express";
import { omit } from "ramda";
import { StationsRepository } from "../../core/stations/application/repository";
import { StationEntities } from "../../core/stations/domain/entities";
import { useRoutes } from "./router";

export const mountResource = (
  app: Express,
  resourceName: keyof StationEntities,
  prefix: string,
  repository: StationsRepository,
  options?: { omit?: string[] }
) => {
  useRoutes(app, [
    [
      "post",
      prefix,
      (req, res) => {
        // validate body here
        let v = req.body;
        if (options?.omit) {
          v = omit(options.omit, v);
        }
        repository.create(resourceName, v).then((r: any) => res.json(r));
      },
    ],
    [
      "get",
      `${prefix}/:id`,
      async (req, res) => {
        let result: any = await repository.findById(
          resourceName,
          Number(req.params.id)
        );
        if (options?.omit) {
          result = omit(options.omit, result);
        }
        res.json(result);
      },
    ],
    [
      "put",
      `${prefix}/:id`,
      async (req, res) => {
        // validate body here
        let v = req.body;
        if (options?.omit) {
          v = omit(options.omit, v);
        }
        res.json(
          await repository.update(resourceName, Number(req.params.id), v)
        );
      },
    ],
    [
      "delete",
      `${prefix}/:id`,
      async (req, res) => {
        res.json(await repository.delete(resourceName, Number(req.params.id)));
      },
    ],
  ]);
};
