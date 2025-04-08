import { serve } from "bun";
import { extname, join, normalize, resolve } from "path";

const baseDir = resolve(import.meta.dir);
console.log(`Serving files from: ${baseDir}`);

// --- Configuration ---
const listenHostname = "0.0.0.0";
const listenPort = 3000;
const specificIp = "172.105.75.211"; // Define your specific IP here
// --------------------

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

serve({
  hostname: listenHostname,
  port: listenPort,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    const clientIp = req.headers.get('x-forwarded-for') || req.remoteAddress;
    console.log(`Request: ${req.method} ${pathname} from ${clientIp}`);

    if (pathname === "/") {
      pathname = "/index.html";
    }

    const requestedPath = normalize(join(baseDir, pathname));

    if (!requestedPath.startsWith(baseDir)) {
        console.warn(`Forbidden: Path traversal attempt detected for "${pathname}" resolved to "${requestedPath}"`);
        return new Response("Forbidden", { status: 403 });
    }

    const filePath = requestedPath;

    try {
        const file = Bun.file(filePath);
        const fileExists = await file.exists();

        if (!fileExists) {
            if (pathname === '/settings') { // Redirect /settings to /settings.html
                const possibleHtmlPath = join(baseDir, 'settings.html');
                const settingsExists = await Bun.file(possibleHtmlPath).exists();
                if (settingsExists) {
                     console.log(`Serving: settings.html for request /settings`);
                     return new Response(Bun.file(possibleHtmlPath), {
                         headers: { 'Content-Type': 'text/html' }
                     });
                }
            }
            console.log(`Not Found: File not found at ${filePath}`);
            return new Response("Not Found", { status: 404 });
        }

        const ext = extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        console.log(`Serving: ${filePath} as ${contentType}`);
        return new Response(file, {
            headers: { 'Content-Type': contentType }
        });

    } catch (error) {
         console.error(`Error accessing file ${filePath}:`, error);
         if (error.code === 'ENOENT') {
            return new Response("Not Found", { status: 404 });
         }
         return new Response("Internal Server Error", { status: 500 });
    }
  },
  error(error) {
    console.error("Server error (general):", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

// --- MODIFIED LOGGING WITH CLICKABLE LINKS ---
const ipUrl = `http://${specificIp}:${listenPort}`;

// OSC 8 hyperlink format: \x1B]8;;URL\x1B\\TEXT\x1B]8;;\x1B\\
// Note: \x1B is the ESC character. \x1B\\ is ESC + backslash.
const ipLink = `\x1B]8;;${ipUrl}\x1B\\${ipUrl}\x1B]8;;\x1B\\`;

console.log(`Access via IP:  ${ipLink}`);
// ----------------------------------------------