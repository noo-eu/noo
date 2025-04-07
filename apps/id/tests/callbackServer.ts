import express, { type Request, type Response } from "express";
import fs from "fs";
import https from "https";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.all("/cb", (req: Request, res: Response) => {
  const method = req.method;
  const query = req.query;
  const headers = req.headers;
  let formParams = null;

  if (method === "POST" && req.body) {
    formParams = req.body;
  }

  const response = {
    method,
    url: req.originalUrl,
    query,
    formParams,
    headers,
  };

  console.log("=== OIDC Test Callback ===");
  console.log(response);

  res.json(response);
});

// HTTPS server setup
const options = {
  key: fs.readFileSync("certificates/localhost-key.pem"),
  cert: fs.readFileSync("certificates/localhost.pem"),
};

https.createServer(options, app).listen(22999, () => {
  console.log("Server is running on https://localhost:22999");
});
