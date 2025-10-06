import type { EarthquakeInterface } from "~~/interfaces/earthquake.interface";
import { clearTurkishChars } from "~~/utils/string.util";

// Lightweight Leaflet initializer used on client only
// Exposes startMap() to create a map and plot earthquakes as circle markers
type MapFilters = { city?: string; magnitude?: number };
export async function startMap(containerId: string = "map", filters: MapFilters = {}) {
  if (process.server) return;
  const el = document.getElementById(containerId);
  if (!el) return console.warn(`[leaflet] container #${containerId} not found`);

  // Dynamically import Leaflet only on client
  const L = await import("leaflet");
  // Read persisted settings
  const getSettings = () => {
    try {
      const raw = localStorage.getItem("zelzele.settings");
      if (!raw) return {} as any;
      return JSON.parse(raw) as {
        baseLayer?: "Carto Light" | "OSM" | "Stamen Toner";
        useCluster?: boolean;
        fitTurkey?: boolean;
      };
    } catch {
      return {} as any;
    }
  };
  const settings = getSettings();
  let markerClusterGroup: any | null = null;
  try {
    // @ts-ignore - runtime import for cluster plugin
    await import("leaflet.markercluster");
    // @ts-ignore
    const clusterFactory = (L as any).markerClusterGroup
      ? (L as any).markerClusterGroup
      : (options: any) => new (L as any).MarkerClusterGroup(options);
    markerClusterGroup = clusterFactory({
      iconCreateFunction: (cluster: any) => {
        const markers: any[] = cluster.getAllChildMarkers?.() || [];
        const count = markers.length;
        let avg = 0;
        if (count > 0) {
          avg =
            markers.reduce((acc: number, m: any) => acc + (Number(m.options?.mag) || 0), 0) /
            count;
        }
        // Map avg magnitude to default cluster size classes
        const cls = avg >= 7 ? "marker-cluster-large" : avg >= 5 ? "marker-cluster-medium" : "marker-cluster-small";
        return new (L as any).DivIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster ${cls}`,
          iconSize: (L as any).point(40, 40),
        });
      },
    });
  } catch {
    markerClusterGroup = null; // graceful fallback
  }
  // Default Leaflet CSS expects image assets; we rely on nuxt css import for styles

  // Turkey bounds and map init
  const TURKEY_BOUNDS = L.latLngBounds([
    [35.808, 26.043], // SW
    [42.107, 45.000], // NE
  ]);
  const mapOptions: any = {
    zoomControl: true,
    attributionControl: true,
    minZoom: 5,
  };
  if (settings.fitTurkey !== false) {
    mapOptions.maxBounds = TURKEY_BOUNDS;
    mapOptions.maxBoundsViscosity = 1.0;
  }
  const map = L.map(el, mapOptions).setView([38.9637, 35.2433], 6.6);

  // Base layers
  const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  });
  const cartoLight = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 20,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }
  );
  const stamenToner = L.tileLayer(
    "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png",
    {
      maxZoom: 20,
      attribution: '&copy; <a href="http://stamen.com">Stamen</a> & OSM contributors',
    }
  );
  const baseLayers: Record<string, any> = {
    "OSM": osm,
    "Carto Light": cartoLight,
    "Stamen Toner": stamenToner,
  };
  // Add default base from settings (fallback: Carto Light)
  const defaultBase = baseLayers[settings.baseLayer as keyof typeof baseLayers] || cartoLight;
  defaultBase.addTo(map);
  // Layer control
  L.control.layers(baseLayers, {}).addTo(map);

  try {
    // Select endpoint by data source
    const ds = (settings as any)?.dataSource || "both";
    const endpoint = ds === "afad"
      ? "/api/earthquakes"
      : ds === "koeri"
      ? "/api/earthquakes-koeri"
      : "/api/earthquakes-combined?source=both";
    let res: Array<EarthquakeInterface> = await $fetch(endpoint);
    if (!Array.isArray(res) || res.length === 0) {
      console.warn("[leaflet] no earthquake data");
      return;
    }
    // Apply optional filters
    if (filters.city) {
      const cityNorm = clearTurkishChars(String(filters.city));
      res = res.filter((item) => clearTurkishChars(item.Region?.City || "") === cityNorm);
    }
    if (typeof filters.magnitude === "number" && Number.isFinite(filters.magnitude)) {
      res = res.filter((item) => Number(item.Magnitude) > Number(filters.magnitude));
    }
    const points: Array<[number, number]> = [];
    res.forEach((item) => {
      if (
        typeof item.Latitude !== "number" ||
        typeof item.Longitude !== "number" ||
        !Number.isFinite(item.Latitude) ||
        !Number.isFinite(item.Longitude)
      )
        return;
      points.push([item.Latitude, item.Longitude]);
      const magnitude = Number(item.Magnitude) || 0;
      const radius = Math.max(3000, Math.pow(3.2, magnitude) * 1000);
      const color = magnitude >= 7 ? "#e53935" : magnitude >= 5 ? "#fb8c00" : "#424242";
      if (settings.heatmap) {
        // Heatmap modunda marker çizme, sadece heat layer kullanacağız
        return;
      }
      const popupHtml =
        `<strong>${item.Region?.City || ""} ${item.Region?.District || ""}</strong><br/>` +
        `M: ${magnitude.toFixed(1)}<br/>` +
        `Derinlik: ${item.Depth} km<br/>` +
        `${item.Date}`;
      if (markerClusterGroup && settings.useCluster !== false) {
        const marker = L.circleMarker([item.Latitude, item.Longitude], {
          radius: Math.max(3, Math.min(12, magnitude * 2)),
          color,
          weight: 1,
          fillColor: color,
          fillOpacity: 0.8,
          // custom option to carry magnitude
          mag: magnitude,
        } as any).bindPopup(popupHtml);
        markerClusterGroup.addLayer(marker as any);
      } else {
        L.circle([item.Latitude, item.Longitude], {
          radius,
          color,
          weight: 1,
          fillColor: color,
          fillOpacity: 0.35,
        })
          .addTo(map)
          .bindPopup(popupHtml);
      }
    });
    if (markerClusterGroup) {
      (markerClusterGroup as any).addTo(map);
    }
    // Heatmap layer (optional)
    if (settings.heatmap) {
      try {
        // @ts-ignore
        await import("leaflet.heat");
        // Build heat points [lat, lng, intensity]
        const heatPoints: Array<[number, number, number]> = res
          .filter((it) => Number.isFinite(Number(it.Magnitude)))
          .map((it) => [it.Latitude, it.Longitude, Math.max(0.1, Math.min(1, Number(it.Magnitude) / 10))]);
        // @ts-ignore
        const heat = (L as any).heatLayer(heatPoints, { radius: 25, blur: 15, maxZoom: 12 });
        heat.addTo(map);
      } catch (e) {
        console.warn("[leaflet] heatmap not available", e);
      }
    }
    if (points.length) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  } catch (error) {
    console.error("[leaflet] fetch or render error", error);
  }

  // Ensure map fits its container after mount and on resize
  setTimeout(() => {
    map.invalidateSize();
  }, 0);
  window.addEventListener("resize", () => map.invalidateSize());

  // Geolocation (user marker) if enabled
  if ((settings as any)?.showLocation && navigator.geolocation) {
    let userMarker: any = null;
    let accuracyCircle: any = null;
    const drawPosition = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const latlng = [latitude, longitude] as [number, number];
      if (!userMarker) {
        userMarker = (L as any).marker(latlng, { title: "Benim Konumum" }).addTo(map);
      } else {
        userMarker.setLatLng(latlng);
      }
      if (!accuracyCircle) {
        accuracyCircle = (L as any).circle(latlng, {
          radius: Math.max(accuracy, 30),
          color: "#1976d2",
          weight: 1,
          fillColor: "#1976d2",
          fillOpacity: 0.15,
        }).addTo(map);
      } else {
        accuracyCircle.setLatLng(latlng);
        accuracyCircle.setRadius(Math.max(accuracy, 30));
      }
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        drawPosition(pos);
      },
      (err) => console.warn("[leaflet] geolocation currentPosition error", err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
    if ((settings as any)?.liveTracking) {
      navigator.geolocation.watchPosition(
        (pos) => drawPosition(pos),
        (err) => console.warn("[leaflet] geolocation watchPosition error", err),
        { enableHighAccuracy: true, maximumAge: 2000 }
      );
    }
  }
}

export default {
  startMap,
};
