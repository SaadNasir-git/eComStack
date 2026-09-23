import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FastifyInstance, RouteOptions, RouteHandlerMethod } from 'fastify';

type RouteConfig = Omit<RouteOptions, 'method' | 'url' | 'handler'>;

type RouteModule = {
  config?: RouteConfig;
  handler: RouteHandlerMethod;
  methods?: readonly string[];
};

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;
type Method = (typeof METHODS)[number];
type UpperMethod = Uppercase<Method>;

const UPPER_METHODS = new Set<string>(METHODS.map((m) => m.toUpperCase()));

type ParsedRoute = {
  methods: UpperMethod[];
  url: string;
};

function parseRoute(relPath: string): ParsedRoute | null {
  const noExt = relPath.replace(/\.(ts|js|mts|mjs)$/, '');
  const segments = noExt.split(sep);

  const last = segments[segments.length - 1]!;

  if (last === 'route') {
    segments.pop();
    const converted = segments.map((s) => s.replace(/^\[(.+)\]$/, ':$1'));
    const url = '/' + converted.join('/');
    return {
      methods: [],
      url: url === '/' ? '/' : url.replace(/\/$/, ''),
    };
  }

  if (!METHODS.includes(last as Method)) return null;

  const method = last as Method;
  segments.pop();

  const converted = segments.map((s) => s.replace(/^\[(.+)\]$/, ':$1'));
  const url = '/' + converted.join('/');
  return {
    methods: [method.toUpperCase() as UpperMethod],
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

    const isMultiRouteFile = /(^|[\\/])route\.(ts|js|mts|mjs)$/.test(rel);

    const parsed = parseRoute(rel);
    if (!parsed) {
      app.log.warn(
        { file: rel },
        'skipped route file (last segment must be an HTTP method, or the file must be named `route.ts`)'
      );
      continue;
    }

    const mod = (await import(pathToFileURL(file).href)) as RouteModule;
    if (typeof mod.handler !== 'function') {
      app.log.warn({ file }, 'skipped route file with no `handler` export');
      continue;
    }

    let methods: UpperMethod[];
    if (isMultiRouteFile) {
      if (!Array.isArray(mod.methods) || mod.methods.length === 0) {
        app.log.warn(
          { file: rel },
          'skipped `route.ts` file: expected a non-empty `methods` array export'
        );
        continue;
      }
      const normalized = mod.methods.map((m) => String(m).toUpperCase());
      const invalid = normalized.filter((m) => !UPPER_METHODS.has(m));
      if (invalid.length > 0) {
        app.log.warn(
          { file: rel, invalid },
          'skipped `route.ts` file: `methods` contains unsupported HTTP methods'
        );
        continue;
      }
      methods = normalized as UpperMethod[];
    } else {
      methods = parsed.methods;
    }

    for (const method of methods) {
      app.route({
        method,
        url: parsed.url,
        ...(mod.config ?? {}),
        handler: mod.handler,
      } as RouteOptions);

      app.log.info({ method, url: parsed.url, file: rel }, 'route registered');
    }
  }
}