export type Point = { lat: number; lng: number };

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
  const deltaLngRad = degreeToRadians(a.lng - b.lng);

  const temp =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) *
      Math.sin(deltaLngRad / 2);
  var temp2 = 2 * Math.atan2(Math.sqrt(temp), Math.sqrt(1 - temp));

  return R * temp2;
}

export function boundingBoxForPointAndSide(a: Point, s: number) {
  const latRad = degreeToRadians(a.lat);
  const lngRad = degreeToRadians(a.lng);
  const halfSide = s / 2;

  const radius = WGS84EarthRadius(latRad);
  const pradius = radius * Math.cos(latRad);

  const latRadMin = latRad - halfSide / radius;
  const latRadMax = latRad + halfSide / radius;
  const lngRadMin = lngRad - halfSide / pradius;
  const lngRadMax = lngRad + halfSide / pradius;

  return [
    radiansToDegrees(latRadMin),
    radiansToDegrees(lngRadMin),
    radiansToDegrees(latRadMax),
    radiansToDegrees(lngRadMax)
  ];
}
