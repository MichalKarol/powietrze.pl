import React, { useState, useEffect } from "react";
import { Map as LMap, Marker, Popup, TileLayer, Circle } from "react-leaflet";
import "./MainView.css";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import cn from "classnames";

export type Source = "PWR" | "GIOS" | "AIRLY" | "LOOKO2";
export type Position = {
  lat: number;
  lon: number;
};

export type Level = "INACTIVE" | "OK" | "1" | "2" | "3";

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
  const [hasFailed, setHasFailed] = useState<boolean>(false);

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
      .then(response => setData(response))
      .catch(error => {
        console.log(error);
        setHasFailed(true);
      });
  }, [position]);

  const iconMap = new Map<string, L.DivIcon>(
    ["inactive", "ok", "level-1", "level-2", "level-3", "level-4"].map(
      level => [
        level,
        L.divIcon({
          className: `div-icon ${level}`,
          iconSize: [20, 20]
        })
      ]
    )
  );

  function getLevelClass(value: number | null) {
    if (value === null) return "inactive";
    if (value < 10) return "ok";
    if (value < 15) return "level-1";
    if (value < 25) return "level-2";
    if (value < 35) return "level-3";
    return "level-4";
  }

  function getIcon(sensor: Sensor) {
    return iconMap.get(getLevelClass(sensor.value));
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

  function getAveragePollution(data: Array<Sensor>): number {
    return data.reduce((acc, v) => acc + (v.value || 0), 0) / data.length;
  }

  return (
    <>
      <div className="map-container">
        <LMap
          center={getLatLng(position || DEFAULT_POSITION)}
          zoom={10}
          id="mapid"
        >
          <TileLayer
            url="https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}"
            attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> 
                          © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> 
                          <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank" rel="noreferer noopener">
                          Improve this map</a></strong>'
            id="mapbox.light"
            accessToken="pk.eyJ1IjoibWthcm9sIiwiYSI6ImNqazl4ODMxMDJ3OTEzd2xlbnN6OHRlMTgifQ.I_mm4Sc8fkKJaFpQc8BWjg"
          >
            XD
          </TileLayer>
          {position && (
            <>
              <Circle center={getLatLng(position)} radius={RADIUS} />
              {data.map((s, idx) => (
                <Marker position={getLatLng(s)} key={idx} icon={getIcon(s)}>
                  {s.value && (
                    <Popup>
                      {s.value} ug/m3{" "}
                      <a
                        href={getUrl(s)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {s.source}
                      </a>
                    </Popup>
                  )}
                </Marker>
              ))}
            </>
          )}
          {data.length > 0 ? (
            <div
              className={cn([
                "pollution-avg",
                getLevelClass(getAveragePollution(data))
              ])}
            >
              {getAveragePollution(data).toPrecision(2)}
            </div>
          ) : (
            <div
              className={cn([
                "pollution-avg",
                hasFailed ? "offline" : "inactive"
              ])}
            >
              {hasFailed ? "Offline" : "-"}
            </div>
          )}
        </LMap>
      </div>
    </>
  );
}
