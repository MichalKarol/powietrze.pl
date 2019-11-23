import { pairOfPointsToMeters, Point, Sensor, Source } from "../utils";
import { default as fetch } from "node-fetch";
import { Agent } from "https";

type AnnotatedPoint = Point & { id: string };

// Beacuse of very old configuration I am forced to use HTTP instead HTTPS

async function getSensorValue(sensor: { id: string }) {
  const sensorResponse = await fetch(
    `http://api.gios.gov.pl/pjp-api/rest/data/getData/${sensor.id}`
  );
  const sensorData = await sensorResponse.json();
  const nonNullableValues = sensorData.values.filter(
    (valueObject: any) => valueObject.value !== null
  );

  return nonNullableValues.length > 0 ? nonNullableValues[0].value : null;
}

async function getValueFromStation(
  station: AnnotatedPoint
): Promise<number | null> {
  const stationResponse = await fetch(
    `http://api.gios.gov.pl/pjp-api/rest/station/sensors/${station.id}`
  );
  if (!stationResponse.ok) return null;
  const stationData = await stationResponse.json();

  const PM25Sensors = stationData.filter(
    (sensor: any) => sensor.param.paramCode === "PM2.5"
  );

  return PM25Sensors.length > 0 ? await getSensorValue(PM25Sensors[0]) : null;
}

export async function giosSource(
  currentLocation: Point,
  radius: number
): Promise<Array<Sensor>> {
  const response = await fetch(
    "http://api.gios.gov.pl/pjp-api/rest/station/findAll"
  );
  if (!response.ok) return [];

  const jsonResponse = await response.json();
  const markersWithPoint: Array<AnnotatedPoint> = jsonResponse.map(
    (marker: any) => ({
      lat: Number.parseFloat(marker.gegrLat),
      lon: Number.parseFloat(marker.gegrLon),
      id: marker.id
    })
  );
  const markersInRadius = markersWithPoint.filter(
    marker => pairOfPointsToMeters(currentLocation, marker) < radius
  );
  const annotetedMarkersInRadius = await Promise.all(
    markersInRadius.map(async marker => ({
      lat: marker.lat,
      lon: marker.lon,
      value: await getValueFromStation(marker),
      source: "GIOS" as Source
    }))
  );
  return annotetedMarkersInRadius;
}
