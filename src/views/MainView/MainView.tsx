import React, { useState } from "react";
import { Map, Marker, Popup, TileLayer, Circle } from "react-leaflet";
import "./MainView.css";
import "leaflet/dist/leaflet.css";
import { usePWrSource } from "../../services/usePWrSource";
import L from "leaflet";
import { useAirlySource } from "../../services/useAirlySource";
import { useGIOSSource } from "../../services/useGIOSSource";
import { useLookO2Source } from "../../services/useLooko2Source";

export type Source = "PWR" | "GIOS" | "AIRLY" | "LOOKO2";

export type Sensor = {
  lat: number;
  lng: number;
  value: number | null;
  source: Source;
};

export function MainView() {
  const [position, setPosition] = useState({ lat: 51.107, lng: 17.0385 });
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(geoposition => {
      setPosition({
        lat: geoposition.coords.latitude,
        lng: geoposition.coords.longitude
      });
    });
  }

  const radius = 10000;
  const { airly_data } = useAirlySource(position, radius);
  const { gios_data } = useGIOSSource(position, radius);
  const { looko2_data } = useLookO2Source(position, radius);
  const { pwr_data } = usePWrSource(position, radius);

  const data = new Array<Sensor>()
    .concat(airly_data)
    .concat(pwr_data)
    .concat(gios_data)
    .concat(looko2_data);

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

  // function getLogo(sensor: Sensor) {
  //   switch (sensor.source) {
  //     case "AIRLY":
  //       return "https://antyweb.pl/wp-content/uploads/2016/11/airly-logo.jpg";
  //     case "GIOS":
  //       return "http://www.gios.gov.pl/images/logo.png";
  //     case "PWR":
  //       return "https://gfx.dlastudenta.pl/photos/uczelnie/pwr_320.jpg";
  //     case "LOOKO2":
  //       return "https://looko2web.nazwa.pl/wp-content/themes/looko2/img/logo.png";
  //   }
  // }

  return (
    <Map center={position} zoom={10} id="mapid">
      <TileLayer
        url="https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}"
        attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> 
                          © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> 
                          <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank" rel="noreferer noopener">
                          Improve this map</a></strong>'
        id="mapbox.light"
        accessToken="pk.eyJ1IjoibWthcm9sIiwiYSI6ImNqazl4ODMxMDJ3OTEzd2xlbnN6OHRlMTgifQ.I_mm4Sc8fkKJaFpQc8BWjg"
      />
      <Circle center={position} radius={radius} />
      {data.map((s, idx) => (
        <Marker position={s} key={idx} icon={getIcon(s)}>
          {s.value && (
            <Popup>
              {s.value} ug/m3 {s.source}
            </Popup>
          )}
        </Marker>
      ))}
    </Map>
  );
}
