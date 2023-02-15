import { Express, Handler } from 'express';

export type Method = 'get' | 'put' | 'delete' | 'post'
export type Path = string;
export type RouterTuple = [Method, Path, Handler]
export const useRoutes = (app: Express, routes: RouterTuple[]) => {
  routes.forEach(([method, path, handler]) => {
    app[method](path, async (req, res, next) => {
      try {
        await handler(req, res, next)
      } catch (e) {
        next(e);
      }
    })
  })
}
