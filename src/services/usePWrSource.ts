import { useState, useEffect } from "react";
import { Sensor, Source } from "../views/MainView/MainView";
import { pairOfPointsToMeters, Point } from "../utils";

export function usePWrSource(currentLocation: Point, radius: number) {
  const [data, setData] = useState<Array<Sensor> | null>(null);
  useEffect(() => {
    fetch(
      "https://cors-anywhere.herokuapp.com/czujniki-pwr.kdm.wcss.pl/smog.html"
    )
      .then(response => response.text())
      .then(response => {
        const marker_lines = response
          .replace(/(.*)\(\s*/g, "$1(")
          .match(/var\smarker_(.*)\s=.*/g);
        const markers =
          marker_lines?.map(
            (marker_line: string) =>
              Array.from(
                /marker_(.*)\s=.*\[(.*),\s*(.*)\]/g.exec(marker_line) || []
              ) as [string, string, string, string]
          ) || [];

        const iframe_lines = response.match(/var\si_frame_(.*)\s=.*/g);
        const iframes = iframe_lines?.map(
          (iframe_line: string) =>
            /i_frame_(.*)\s=\s.*?base64,(.*?)"/g
              .exec(iframe_line)
              ?.slice(1) as [string, string]
        );
        const iframe_value_map = new Map<string, string>(iframes);

        const popup_iframe_lines = response.match(/popup_(.*)\.setContent.*/g);
        const popup_iframes_matches =
          popup_iframe_lines?.map(
            (popup_iframe_line: string) =>
              /popup_(.*)\.setContent\(i_frame_(.*)\)/g
                .exec(popup_iframe_line)
                ?.slice(1) as [string, string]
          ) || [];
        const popup_iframe_map = new Map<string, string>(popup_iframes_matches);

        const marker_popup_lines = response.match(/marker_(.*)\.bindPopup.*/g);
        const marker_popup_matches: [string, string][] =
          marker_popup_lines?.map(
            (marker_popup_line: string) =>
              /marker_(.*)\.bindPopup\(popup_(.*)\)/g
                .exec(marker_popup_line)
                ?.slice(1) as [string, string]
          ) || [];
        const marker_popup_map = new Map<string, string>(marker_popup_matches);

        const value_from_base64 = (b64: string) => {
          return Number.parseFloat(
            />(\d+)\s.*?µg\/m/g.exec(atob(b64))?.[1] || ""
          );
        };

        const sensors = markers.map(
          (marker: [string, string, string, string]) => ({
            lat: Number.parseFloat(marker[2]),
            lng: Number.parseFloat(marker[3]),
            value:
              value_from_base64(
                iframe_value_map.get(
                  popup_iframe_map.get(marker_popup_map.get(marker[1]) || "") ||
                    ""
                ) || ""
              ) || null,
            source: "PWR" as Source
          })
        );

        const sensorsInRadius = sensors.filter(
          (sensor: Sensor) =>
            pairOfPointsToMeters(currentLocation, sensor) < radius
        );

        setData(sensorsInRadius);
      });
  }, [currentLocation, radius]);

  return {
    pwr_data: data || []
  };
}
