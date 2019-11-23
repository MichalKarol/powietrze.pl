import { captureException } from "@sentry/node";

export type Point = { lat: number; lon: number };
export type Source = "PWR" | "GIOS" | "AIRLY" | "LOOKO2";

export type Sensor = {
  lat: number;
  lon: number;
  value: number | null;
  source: Source;
};

const R = 6371e3;

function degreeToRadians(d: number) {
  return (d / 180) * Math.PI;
}

function radiansToDegrees(r: number) {
  return (r * 180) / Math.PI;
}

function WGS84EarthRadius(lat: number) {
  const An = R * R * Math.cos(lat);
  const Bn = R * R * Math.sin(lat);
  const Ad = R * Math.cos(lat);
  const Bd = R * Math.sin(lat);
  return Math.sqrt((An * An + Bn * Bn) / (Ad * Ad + Bd * Bd));
}

export function pairOfPointsToMeters(a: Point, b: Point) {
  const lat1Rad = degreeToRadians(a.lat);
  const lat2Rad = degreeToRadians(b.lat);
  const deltaLatRad = degreeToRadians(a.lat - b.lat);
  const deltaLonRad = degreeToRadians(a.lon - b.lon);

  const temp =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) *
      Math.sin(deltaLonRad / 2);
  var temp2 = 2 * Math.atan2(Math.sqrt(temp), Math.sqrt(1 - temp));

  return R * temp2;
}

export function boundingBoxForPointAndSide(a: Point, s: number) {
  const latRad = degreeToRadians(a.lat);
  const lonRad = degreeToRadians(a.lon);
  const halfSide = s / 2;

  const radius = WGS84EarthRadius(latRad);
  const pradius = radius * Math.cos(latRad);

  const latRadMin = latRad - halfSide / radius;
  const latRadMax = latRad + halfSide / radius;
  const lonRadMin = lonRad - halfSide / pradius;
  const lonRadMax = lonRad + halfSide / pradius;

  return [
    radiansToDegrees(latRadMin),
    radiansToDegrees(lonRadMin),
    radiansToDegrees(latRadMax),
    radiansToDegrees(lonRadMax)
  ];
}

export function fallback<T>(promise: Promise<T>, fallbackValue: T): Promise<T> {
  return new Promise<T>(resolve => {
    promise
      .then(value => resolve(value))
      .catch(error => {
        captureException(error);
        resolve(fallbackValue);
      });
  });
}
