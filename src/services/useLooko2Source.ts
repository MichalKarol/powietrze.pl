import { useState, useEffect } from "react";
import { Sensor, Source } from "../views/MainView/MainView";
import { pairOfPointsToMeters, Point } from "../utils";

type AnnotatedPoint = Point & { Device: string };

function getValueFromSensor(sensor: AnnotatedPoint): Promise<number | null> {
  return fetch(
    `https://cors-anywhere.herokuapp.com/looko2.com/tracker.php?lan=&search=${sensor.Device}`
  )
    .then(response => response.text())
    .then(response => {
      const matchedGroup = /PM2\.5.*?(\d+)\sug\/m3\s/g.exec(response);
      return (
        (matchedGroup?.length === 2 && Number.parseFloat(matchedGroup[1])) ||
        null
      );
    });
}

export function useLookO2Source(currentLocation: Point, radius: number) {
  const [data, setData] = useState<Array<Sensor> | null>(null);
  useEffect(() => {
    fetch("https://cors-anywhere.herokuapp.com/looko2.com/heatmap.php")
      .then(response => response.text())
      .then(async response => {
        const jsonData = /var\sjsonData\s=\s'(.*)';/g.exec(response)?.[1];
        const data = JSON.parse(jsonData || "") as Array<any>;
        const sensors: Array<AnnotatedPoint> = data.map(sensor => ({
          Device: sensor.Device,
          lat: Number.parseFloat(sensor.Lat),
          lng: Number.parseFloat(sensor.Lon)
        }));
        const sensorsInRadius = sensors.filter(
          point => pairOfPointsToMeters(currentLocation, point) < radius
        );
        const annotatedSensors = await Promise.all<Sensor>(
          sensorsInRadius.map(async sensor => ({
            lat: sensor.lat,
            lng: sensor.lng,
            value: await getValueFromSensor(sensor),
            source: "LOOKO2" as Source
          }))
        );
        console.log(annotatedSensors);
        setData(annotatedSensors);
      });
  }, [currentLocation, radius]);

  return {
    looko2_data: data || []
  };
}
