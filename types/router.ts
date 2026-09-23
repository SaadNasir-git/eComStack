import type { RouteHandlerMethod, RouteOptions } from "fastify";

export type RouteConfig = Omit<RouteOptions, 'method' | 'url' | 'handler'>;
export type RouteModule = {
  config?: RouteConfig;
  handler: RouteHandlerMethod;
  methods?: readonly string[];
};