import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FastifyInstance, RouteOptions, RouteHandlerMethod } from 'fastify';

type RouteConfig = Omit<RouteOptions, 'method' | 'url' | 'handler'>;
type RouteModule = {
  config?: RouteConfig;
  handler: RouteHandlerMethod;
};

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;
type Method = (typeof METHODS)[number];

function parseRoute(relPath: string): { method: Uppercase<Method>; url: string } {
  const noExt = relPath.replace(/\.(ts|js|mts|mjs)$/, '');
  const segments = noExt.split(sep);

  const last = segments.pop()!;
  const [name, maybeMethod] = last.split('.');
  const method = (METHODS.includes(maybeMethod as Method) ? maybeMethod : 'get') as Method;

  const converted = [...segments, name!]
    .filter((s) => s !== 'index')
    .map((s) => s.replace(/^\[(.+)\]$/, ':$1'));

  const url = '/' + converted.join('/');
  return {
    method: method.toUpperCase() as Uppercase<Method>,
    url: url === '/' ? '/' : url.replace(/\/$/, ''),
  };
}

export async function registerFileRoutes(
  app: FastifyInstance,
  routesDir: string
): Promise<void> {
  const files: string[] = [];

  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(ts|js|mts|mjs)$/.test(entry.name)) files.push(full);
    }
  }
  await walk(routesDir);

  for (const file of files) {
    const rel = relative(routesDir, file);
    const { method, url } = parseRoute(rel);

    const mod = (await import(pathToFileURL(file).href)) as RouteModule;
    if (typeof mod.handler !== 'function') {
      app.log.warn({ file }, 'skipped route file with no `handler` export');
      continue;
    }

    app.route({
      method,
      url,
      ...(mod.config ?? {}),
      handler: mod.handler,
    } as RouteOptions);

    app.log.info({ method, url, file: rel }, 'route registered');
  }
}