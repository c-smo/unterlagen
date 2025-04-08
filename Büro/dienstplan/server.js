import { serve } from "bun";
import { join } from "path";

const baseDir = import.meta.dir;
console.log(`Serving files from: ${baseDir}`);

// --- Configuration ---
const listenHostname = "0.0.0.0"; // Listen on all network interfaces
// You could explicitly use "172.105.75.211", but 0.0.0.0 is more standard
const listenPort = 3000;        // Make sure this port is open in your firewall
// --------------------

serve({
  hostname: listenHostname, // Add this line
  port: listenPort,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    console.log(`Request received for: ${pathname} from ${req.headers.get('x-forwarded-for') || req.remoteAddress}`); // Log remote address

    let filePath;

    if (pathname === "/") {
      filePath = join(baseDir, "index.html");
    } else if (pathname === "/placeholder.html") {
      filePath = join(baseDir, "placeholder.html");
    } else {
      console.log(`File not found for path: ${pathname}`);
      return new Response("Not Found", { status: 404 });
    }

    const file = Bun.file(filePath);
    const fileExists = await file.exists();

    if (!fileExists) {
      console.error(`File not found at path: ${filePath}`);
      return new Response("Not Found", { status: 404 });
    }

    console.log(`Serving file: ${filePath}`);
    return new Response(file);
  },
  error(error) {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

// Log the accessible address clearly
console.log(`Bun server running.`);
console.log(`Access it locally: http://localhost:${listenPort}`);
console.log(`Access it via IP:  http://172.105.75.211:${listenPort}`);
// If hostname is 0.0.0.0, it will listen on the public IP