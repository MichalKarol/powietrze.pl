import { useState, useEffect } from "react";
import { Sensor, Source } from "../views/MainView/MainView";
import { pairOfPointsToMeters, Point } from "../utils";

type AnnotatedPoint = Point & { id: string };

function getValueFromStation(station: AnnotatedPoint): Promise<number | null> {
  return fetch(
    `https://cors-anywhere.herokuapp.com/api.gios.gov.pl/pjp-api/rest/station/sensors/${station.id}`
  )
    .then(response => response.json())
    .then(async sensors => {
      const PM25Sensors = sensors.filter(
        (sensor: any) => sensor.param.paramCode === "PM2.5"
      );
      const getSensorValue = async (sensor: { id: string }) => {
        const data = await fetch(
          `https://cors-anywhere.herokuapp.com/api.gios.gov.pl/pjp-api/rest/data/getData/${sensor.id}`
        );
        const sensorData = await data.json();
        const nonNullableValues = sensorData.values.filter(
          (valueObject: any) => valueObject.value !== null
        );

        return nonNullableValues.length > 0 ? nonNullableValues[0].value : null;
      };

      return PM25Sensors.length > 0
        ? await getSensorValue(PM25Sensors[0])
        : null;
    });
}

export function useGIOSSource(currentLocation: Point, radius: number) {
  const [data, setData] = useState<Array<Sensor> | null>(null);
  useEffect(() => {
    fetch(
      "https://cors-anywhere.herokuapp.com/api.gios.gov.pl/pjp-api/rest/station/findAll"
    )
      .then(response => response.json())
      .then(async response => {
        const markersWithPoint: Array<AnnotatedPoint> = response.map(
          (marker: any) => ({
            lat: Number.parseFloat(marker.gegrLat),
            lng: Number.parseFloat(marker.gegrLon),
            id: marker.id
          })
        );
        const markersInRadius = markersWithPoint.filter(
          marker => pairOfPointsToMeters(currentLocation, marker) < radius
        );
        const annotetedMarkersInRadius = await Promise.all(
          markersInRadius.map(async marker => ({
            lat: marker.lat,
            lng: marker.lng,
            value: await getValueFromStation(marker),
            source: "GIOS" as Source
          }))
        );
        setData(annotetedMarkersInRadius);
      });
  }, [currentLocation, radius]);

  return {
    gios_data: data || []
  };
}
