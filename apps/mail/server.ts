import { createRequestHandler } from "@react-router/express";
import { execSync } from "child_process";
import compression from "compression";
import express from "express";
import fs from "fs";
import https from "https";
import morgan from "morgan";
import "./instrument.server";

if (process.env.NODE_ENV !== "production") {
  // Ensure certificates exist
  if (!fs.existsSync("./certificates/localhost.pem")) {
    console.log("Generating development certificates...");

    execSync("mkdir -p ./certificates");
    execSync("mkcert -install");
    execSync("mkcert localhost", {
      cwd: "./certificates",
    });
  }
}

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        }),
      );

const remixHandler = createRequestHandler({
  build: viteDevServer
    ? () => viteDevServer.ssrLoadModule("virtual:react-router/server-build")
    : // @ts-expect-error this file does not exist yet
      await import("./build/server/index.js"), // eslint-disable-line
});

const app = express();

app.use(compression());
app.disable("x-powered-by");

// handle asset requests
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // Vite fingerprints its assets so we can cache forever.
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" }),
  );
}

app.use(morgan("tiny"));
app.all("*any", remixHandler);

const port = process.env.PORT || 13001;

if (process.env.NODE_ENV === "production") {
  app.listen(port, () => {
    console.log(`Express server listening at http://localhost:${port}`);
  });
} else {
  const options = {
    key: fs.readFileSync("./certificates/localhost-key.pem"),
    cert: fs.readFileSync("./certificates/localhost.pem"),
  };

  https.createServer(options, app).listen(port, () => {
    console.log(`Express server listening at https://localhost:${port}`);
  });
}
