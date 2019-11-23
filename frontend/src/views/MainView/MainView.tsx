import React, { useState, useEffect } from "react";
import { Map, Marker, Popup, TileLayer, Circle } from "react-leaflet";
import "./MainView.css";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

export type Source = "PWR" | "GIOS" | "AIRLY" | "LOOKO2";
export type Position = {
  lat: number;
  lon: number;
};

export type Sensor = {
  lat: number;
  lon: number;
  value: number | null;
  source: Source;
};

export function MainView() {
  const [data, setData] = useState<Array<Sensor>>([]);
  const DEFAULT_POSITION = { lat: 51.107, lon: 17.0385 };
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    if (position) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        geoposition => {
          setPosition({
            lat: geoposition.coords.latitude,
            lon: geoposition.coords.longitude
          });
        },
        () => {
          setPosition(DEFAULT_POSITION);
        }
      );
    } else {
      setPosition(DEFAULT_POSITION);
    }
  }, [position, DEFAULT_POSITION]);

  const RADIUS = 5000;

  useEffect(() => {
    if (!position) return;
    fetch("https://powietrze.herokuapp.com/api/values", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ position })
    })
      .then(response => response.json())
      .then(response => setData(response));
  }, [position]);

  const inactiveIcon = L.divIcon({
    className: "div-icon inactive",
    iconSize: [20, 20]
  });
  const okIcon = L.divIcon({ className: "div-icon ok", iconSize: [20, 20] });
  const level1Icon = L.divIcon({
    className: "div-icon level-1",
    iconSize: [20, 20]
  });
  const level2Icon = L.divIcon({
    className: "div-icon level-2",
    iconSize: [20, 20]
  });
  const level3Icon = L.divIcon({
    className: "div-icon level-3",
    iconSize: [20, 20]
  });
  const level4Icon = L.divIcon({
    className: "div-icon level-4",
    iconSize: [20, 20]
  });

  function getIcon(sensor: Sensor) {
    if (sensor.value === null) return inactiveIcon;
    if (sensor.value < 10) return okIcon;
    if (sensor.value < 15) return level1Icon;
    if (sensor.value < 25) return level2Icon;
    if (sensor.value < 35) return level3Icon;
    return level4Icon;
  }

  function getUrl(sensor: Sensor) {
    switch (sensor.source) {
      case "AIRLY":
        return "https://airly.eu/pl/";
      case "GIOS":
        return "https://powietrze.gios.gov.pl/pjp/content/api";
      case "PWR":
        return "http://powietrze.pwr.edu.pl";
      case "LOOKO2":
        return "https://looko2.com";
    }
  }
  function getLatLng(position: Position): L.LatLngLiteral {
    return { lat: position.lat, lng: position.lon };
  }

  return (
    <Map center={getLatLng(position || DEFAULT_POSITION)} zoom={10} id="mapid">
      <TileLayer
        url="https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}"
        attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> 
                          © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> 
                          <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank" rel="noreferer noopener">
                          Improve this map</a></strong>'
        id="mapbox.light"
        accessToken="pk.eyJ1IjoibWthcm9sIiwiYSI6ImNqazl4ODMxMDJ3OTEzd2xlbnN6OHRlMTgifQ.I_mm4Sc8fkKJaFpQc8BWjg"
      />
      {position && (
        <>
          <Circle center={getLatLng(position)} radius={RADIUS} />
          {data.map((s, idx) => (
            <Marker position={getLatLng(s)} key={idx} icon={getIcon(s)}>
              {s.value && (
                <Popup>
                  {s.value} ug/m3{" "}
                  <a href={getUrl(s)} target="_blank" rel="noopener noreferrer">
                    {s.source}
                  </a>
                </Popup>
              )}
            </Marker>
          ))}
        </>
      )}
    </Map>
  );
}
