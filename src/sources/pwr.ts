import { pairOfPointsToMeters, Point, Sensor, Source } from "../utils";
import { default as fetch } from "node-fetch";

type Marker = { id: string; lat: number; lon: number };
type Iframe = { id: string; data: string };
type Popup = { id: string; iframe_id: string };
type Bindings = { marker_id: string; popup_id: string };

function isNotNullOrUndefined<T extends Object>(
  input: null | undefined | T
): input is T {
  return input != null;
}

function getMarkers(data: string): Array<Marker> {
  const marker_lines = data
    .replace(/(.*)\(\s*/g, "$1(")
    .match(/var\smarker_(.*)\s=.*/g);
  if (!marker_lines) return [];

  const markers = marker_lines
    .map(marker_line => /marker_(.*)\s=.*\[(.*),\s*(.*)\]/g.exec(marker_line))
    .filter(isNotNullOrUndefined)
    .map(match => {
      const id = match[1];
      const lat = Number.parseFloat(match[2]);
      const lon = Number.parseFloat(match[3]);
      return { id, lat, lon };
    });
  return markers;
}

function getIframes(data: string): Array<Iframe> {
  const iframe_lines = data.match(/var\si_frame_(.*)\s=.*/g);
  if (!iframe_lines) return [];
  const iframes = iframe_lines
    .map(iframe_line => /i_frame_(.*)\s=\s.*?base64,(.*?)"/g.exec(iframe_line))
    .filter(isNotNullOrUndefined)
    .map(match => ({ id: match[1], data: match[2] }));

  return iframes;
}

function getPopups(data: string): Array<Popup> {
  const popup_lines = data.match(/popup_(.*)\.setContent.*/g);
  if (!popup_lines) return [];
  const popups = popup_lines
    .map(popup_line =>
      /popup_(.*)\.setContent\(i_frame_(.*)\)/g.exec(popup_line)
    )
    .filter(isNotNullOrUndefined)
    .map(match => ({ id: match[1], iframe_id: match[2] }));

  return popups;
}

function getBindings(data: string): Array<Bindings> {
  const binding_lines = data.match(/marker_(.*)\.bindPopup.*/g);
  if (!binding_lines) return [];
  const bindings = binding_lines
    .map(binding_line =>
      /marker_(.*)\.bindPopup\(popup_(.*)\)/g.exec(binding_line)
    )
    .filter(isNotNullOrUndefined)
    .map(match => ({ marker_id: match[1], popup_id: match[2] }));

  return bindings;
}

export async function pwrSource(
  currentLocation: Point,
  radius: number
): Promise<Array<Sensor>> {
  const response = await fetch("https://czujniki-pwr.kdm.wcss.pl/smog.html");
  if (!response.ok) return [];
  const data = await response.text();

  const markers = getMarkers(data);
  const iframes = getIframes(data);
  const popups = getPopups(data);
  const bindings = getBindings(data);

  const iframe_value_map = new Map<string, string>(
    iframes.map(i => [i.id, i.data])
  );
  const popup_iframe_map = new Map<string, string>(
    popups.map(p => [p.id, p.iframe_id])
  );

  const marker_popup_map = new Map<string, string>(
    bindings.map(b => [b.marker_id, b.popup_id])
  );

  const value_from_base64 = (b64: string) => {
    const rawData = Buffer.from(b64, "base64").toString();
    const matched = />(\d+)\s.*?µg\/m/g.exec(rawData);
    if (!matched) return null;
    return Number.parseFloat(matched[1]);
  };

  const sensors = markers.map(marker => ({
    lat: marker.lat,
    lon: marker.lon,
    value: value_from_base64(
      iframe_value_map.get(
        popup_iframe_map.get(marker_popup_map.get(marker.id) || "") || ""
      ) || ""
    ),
    source: "PWR" as Source
  }));

  const sensorsInRadius = sensors.filter(
    sensor => pairOfPointsToMeters(currentLocation, sensor) < radius
  );
  return sensorsInRadius;
}
