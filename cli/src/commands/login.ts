import http from "node:http";
import { exec } from "node:child_process";
import { saveConfig } from "../config";

const PORT = 3456;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function login(): Promise<void> {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url || "", `http://localhost:${PORT}`);
            const token = url.searchParams.get("token");
            const email = url.searchParams.get("email");

            if (token && email) {
                saveConfig({ token, email });
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end("<h1>Success!</h1><p>You can close this window now.</p>");
                console.log(`✔ Logged in as ${email}`);
                server.close();
                resolve();
            } else {
                res.writeHead(400);
                res.end("Invalid request");
            }
        });

        server.listen(PORT, () => {
            const loginUrl = `${APP_URL}/cli/login?callback=http://localhost:${PORT}`;
            console.log(`Logging in via browser...`);
            console.log(`If the browser doesn't open, visit: ${loginUrl}`);

            const command = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
            exec(`${command} "${loginUrl}"`);
        });
    });
}
