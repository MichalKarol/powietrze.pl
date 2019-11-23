import express from "express";
import { fallback, Sensor } from "./utils";
import { airlySource } from "./sources/airly";
import { giosSource } from "./sources/gios";
import { init as SentrInit, captureException } from "@sentry/node";
import { looko2Source } from "./sources/looko2";
import { pwrSource } from "./sources/pwr";
import cors from "cors";

SentrInit({
  dsn: "https://502181445c7e479a90ab9e3ddbc084d2@sentry.io/1831860"
});

const app: express.Application = express();
const port = process.env.PORT || 8080;
const bodyParser = require("body-parser");
const RADIUS = 5000;

app.use(bodyParser.json());
app.use(
  cors({
    origin: "http://localhost:3000"
  })
);
app.post("/api/values", async function(req, res) {
  // validate
  const body = req.body;
  const ok = body && body.position && body.position.lat && body.position.lon;
  if (!ok) {
    res.sendStatus(400);
    return;
  }

  const allSources = Array.from<Array<Sensor>>(
    await Promise.all([
      fallback(airlySource(body.position, RADIUS), []),
      fallback(giosSource(body.position, RADIUS), []),
      fallback(looko2Source(body.position, RADIUS), []),
      fallback(pwrSource(body.position, RADIUS), [])
    ]).catch(error => {
      res.sendStatus(500);
      captureException(error);
      return [];
    })
  );

  res.json(allSources.reduce((acc, v) => acc.concat(v), []));
});
app.listen(port, function() {
  console.log(`Example app listening on port ${port}!`);
});
