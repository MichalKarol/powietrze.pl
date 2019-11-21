import { useState, useEffect } from "react";
import { Sensor, Source } from "../views/MainView/MainView";
import {
  pairOfPointsToMeters,
  Point,
  boundingBoxForPointAndSide
} from "../utils";

type AnnotatedPoint = Point & { id: string };

function getValueFromStation(station: AnnotatedPoint): Promise<number | null> {
  return fetch(
    `https://cors-anywhere.herokuapp.com/airapi.airly.eu/v2/measurements/installation?apikey=fae55480ef384880871f8b40e77bbef9&installationId=${station.id}`
  )
    .then(response => response.json())
    .then(async sensor => {
      const valueArray = sensor.current.values.filter(
        (v: any) => v.name === "PM25"
      );
      return valueArray[0]?.value || null;
    });
}

export function useAirlySource(currentLocation: Point, radius: number) {
  const [data, setData] = useState<Array<Sensor> | null>(null);
  useEffect(() => {
    const [swLat, swLng, neLat, neLng] = boundingBoxForPointAndSide(
      currentLocation,
      radius
    );
    fetch(
      `https://cors-anywhere.herokuapp.com/airapi.airly.eu/v2/markers?swLat=${swLat}&swLng=${swLng}&neLat=${neLat}&neLng=${neLng}&apikey=fae55480ef384880871f8b40e77bbef9`
    )
      .then(response => response.json())
      .then(async response => {
        const markers = response.markers;
        const dataMarkers: Array<any> = markers.filter(
          (marker: any) => marker.hasData
        );
        const dataMarkersWithPoint: Array<AnnotatedPoint> = dataMarkers.map(
          (marker: any) => ({
            lat: Number.parseFloat(marker.location.latitude),
            lng: Number.parseFloat(marker.location.longitude),
            id: marker.id
          })
        );
        const dataMarkersInRadius = dataMarkersWithPoint.filter(
          marker => pairOfPointsToMeters(currentLocation, marker) < radius
        );
        const annotetedMarkersInRadius = await Promise.all(
          dataMarkersInRadius.map(async marker => ({
            lat: marker.lat,
            lng: marker.lng,
            value: await getValueFromStation(marker),
            source: "AIRLY" as Source
          }))
        );
        setData(annotetedMarkersInRadius);
      });
  }, [currentLocation, radius]);
  return {
    airly_data: data || []
  };
}
