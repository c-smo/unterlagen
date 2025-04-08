import { serve } from "bun";
import { extname, join, normalize, resolve } from "path"; // Added extname, resolve, normalize

// Resolve the absolute path to the directory containing server.js
const baseDir = resolve(import.meta.dir);
console.log(`Serving files from: ${baseDir}`);

// --- Configuration ---
const listenHostname = "0.0.0.0"; // Listen on all available network interfaces
const listenPort = 3000;        // Port to listen on
// --------------------

// Basic MIME type mapping for common web files
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
    // Add more types if needed (e.g., fonts: woff, woff2)
};

serve({
  hostname: listenHostname,
  port: listenPort,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Log the request
    const clientIp = req.headers.get('x-forwarded-for') || req.remoteAddress;
    console.log(`Request: ${req.method} ${pathname} from ${clientIp}`);

    // Default to index.html for the root path "/"
    if (pathname === "/") {
      pathname = "/index.html";
    }

    // --- Security Check: Prevent path traversal attacks ---
    // Construct the full path by joining the base directory and the requested pathname
    // Normalize the path (e.g., resolve "../") and ensure it's still within the baseDir
    const requestedPath = normalize(join(baseDir, pathname));

    if (!requestedPath.startsWith(baseDir)) {
        // If the normalized path is outside the intended directory, deny access
        console.warn(`Forbidden: Path traversal attempt detected for "${pathname}" resolved to "${requestedPath}"`);
        return new Response("Forbidden", { status: 403 });
    }

    const filePath = requestedPath;

    try {
        // Check if the requested file exists
        const file = Bun.file(filePath);
        const fileExists = await file.exists();

        if (!fileExists) {
            // Handle case where user accesses /settings without .html
            if (pathname === '/settings') {
                const possibleHtmlPath = join(baseDir, 'settings.html');
                if (await Bun.file(possibleHtmlPath).exists()) {
                     console.log(`Serving settings.html for request /settings`);
                     return new Response(Bun.file(possibleHtmlPath), {
                         headers: { 'Content-Type': 'text/html' }
                     });
                }
            }
            // If file doesn't exist, return 404 Not Found
            console.log(`Not Found: File not found at ${filePath}`);
            return new Response("Not Found", { status: 404 });
        }

        // Determine the correct Content-Type based on the file extension
        const ext = extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream'; // Default if type unknown

        console.log(`Serving: ${filePath} as ${contentType}`);
        // Serve the file with the determined Content-Type
        return new Response(file, {
            headers: { 'Content-Type': contentType }
        });

    } catch (error) {
         // Catch errors during file system access (e.g., permission errors)
         console.error(`Error accessing file ${filePath}:`, error);
         // Check if the error is specifically a "file not found" type, even if exists() check passed (race condition?)
         if (error.code === 'ENOENT') {
            return new Response("Not Found", { status: 404 });
         }
         // For other errors, return a generic server error
         return new Response("Internal Server Error", { status: 500 });
    }
  },
  // General error handler for issues outside the fetch function
  error(error) {
    console.error("Server error (general):", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

// Log server start information
console.log(`Bun server running on port ${listenPort}`);