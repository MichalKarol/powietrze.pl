import {
  pairOfPointsToMeters,
  Point,
  Sensor,
  Source,
  boundingBoxForPointAndSide
} from "../utils";
import { default as fetch } from "node-fetch";

type AnnotatedPoint = Point & { id: string };

async function getValueFromStation(
  station: AnnotatedPoint
): Promise<number | null> {
  const sensorResponse = await fetch(
    `https://airapi.airly.eu/v2/measurements/installation?apikey=fae55480ef384880871f8b40e77bbef9&installationId=${station.id}`
  );
  if (!sensorResponse) return null;

  const sensorJsonResponse = await sensorResponse.json();
  const valueArray = sensorJsonResponse.current.values.filter(
    (v: any) => v.name === "PM25"
  );
  return valueArray[0]?.value || null;
}

export async function airlySource(
  currentLocation: Point,
  radius: number
): Promise<Array<Sensor>> {
  const [swLat, swLon, neLat, neLon] = boundingBoxForPointAndSide(
    currentLocation,
    radius
  );

  const response = await fetch(
    `https://airapi.airly.eu/v2/markers?swLat=${swLat}&swLng=${swLon}&neLat=${neLat}&neLng=${neLon}&apikey=fae55480ef384880871f8b40e77bbef9`
  );
  if (!response.ok) return [];

  const jsonResonse = await response.json();
  const markers = jsonResonse.markers;
  const dataMarkers: Array<any> = markers.filter(
    (marker: any) => marker.hasData
  );
  const dataMarkersWithPoint: Array<AnnotatedPoint> = dataMarkers.map(
    (marker: any) => ({
      lat: Number.parseFloat(marker.location.latitude),
      lon: Number.parseFloat(marker.location.longitude),
      id: marker.id
    })
  );
  const dataMarkersInRadius = dataMarkersWithPoint.filter(
    marker => pairOfPointsToMeters(currentLocation, marker) < radius
  );
  const annotetedMarkersInRadius = await Promise.all(
    dataMarkersInRadius.map(async marker => ({
      lat: marker.lat,
      lon: marker.lon,
      value: await getValueFromStation(marker),
      source: "AIRLY" as Source
    }))
  );
  return annotetedMarkersInRadius;
}
