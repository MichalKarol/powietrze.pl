import { pairOfPointsToMeters, Point, Sensor, Source } from "../utils";
import { default as fetch } from "node-fetch";
import { Agent } from "https";

type AnnotatedPoint = Point & { Device: string };

// Beacuse of wrong certificate chain
const agent = new Agent({
  rejectUnauthorized: false
});

async function getValueFromSensor(
  sensor: AnnotatedPoint
): Promise<number | null> {
  const sensorResponse = await fetch(
    `https://looko2.com/tracker.php?lan=&search=${sensor.Device}`,
    { agent }
  );
  if (!sensorResponse) return null;

  const sensorData = await sensorResponse.text();
  const matchedGroup = /PM2\.5.*?(\d+)\sug\/m3\s/g.exec(sensorData);
  return (
    (matchedGroup?.length === 2 && Number.parseFloat(matchedGroup[1])) || null
  );
}

export async function looko2Source(currentLocation: Point, radius: number) {
  const response = await fetch("https://looko2.com/heatmap.php", { agent });
  if (!response.ok) return [];

  const markerData = await response.text();
  const jsonData = /var\sjsonData\s=\s'(.*)';/g.exec(markerData)?.[1];
  const data = JSON.parse(jsonData || "") as Array<any>;
  const sensors: Array<AnnotatedPoint> = data.map(sensor => ({
    Device: sensor.Device,
    lat: Number.parseFloat(sensor.Lat),
    lon: Number.parseFloat(sensor.Lon)
  }));
  const sensorsInRadius = sensors.filter(
    point => pairOfPointsToMeters(currentLocation, point) < radius
  );
  const annotatedSensors = await Promise.all<Sensor>(
    sensorsInRadius.map(async sensor => ({
      lat: sensor.lat,
      lon: sensor.lon,
      value: await getValueFromSensor(sensor),
      source: "LOOKO2" as Source
    }))
  );
  return annotatedSensors;
}
