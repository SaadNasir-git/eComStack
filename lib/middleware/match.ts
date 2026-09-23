import { eComConfig } from "@/ecom.config";

function compile(pattern: string): RegExp {
    const source = pattern
        .replace(/\/+$/, '')                             // strip trailing slash
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')            // escape regex chars
        .replace(/\/\*\*/g, '/__DOUBLE_STAR__')          // protect **
        .replace(/\*/g, '[^/]+')                          // * → one segment
        .replace(/__DOUBLE_STAR__/g, '.*')               // ** → anything
        .replace(/:([A-Za-z0-9_]+)/g, '[^/]+');          // :id → one segment
    return new RegExp(`^${source}$`);
}

const cache = new Map<string, RegExp>();

export function matchesPattern(path: string, pattern: string): boolean {
    let re = cache.get(pattern);
    if (!re) {
        re = compile(pattern);
        cache.set(pattern, re);
    }
    const clean = path.split('?')[0]!;
    return re.test(clean);
}

let prefix = eComConfig.env.PREFIX;
function stripPrefix(url: string, prefix: string): string {
    let path: string;
    try {
        path = /^[a-z][a-z0-9+.-]*:\/\//i.test(url)
            ? new URL(url).pathname
            : url.split(/[?#]/)[0]!;
    } catch {
        path = url.split(/[?#]/)[0]!;
    }
    if (!path.startsWith('/')) path = '/' + path;

    const p = '/' + (prefix || '').replace(/^\/+|\/+$/g, '');
    if (p === '/') return path;

    if (path === p) return '/';
    if (path.startsWith(p + '/')) {
        const rel = path.slice(p.length);
        return rel || '/';
    }
    return path;
}

export function shouldRun(url: string, paths: string[], exclude: string[] = []): boolean {
    const clean = stripPrefix(url, prefix) || '/';
    console.log(clean);
    if (!paths.some((p) => matchesPattern(clean, p))) return false;
    return !exclude.some((p) => matchesPattern(clean, p));
}