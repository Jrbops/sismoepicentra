export interface EarthquakeInterface {
  ID: string;
  Date: string;
  Magnitude: number;
  Type: string;
  Latitude: number;
  Longitude: number;
  Depth: number;
  Region: {
    City: string;
    District: string;
  };
  Source?: "AFAD" | "KOERI";
  ProviderURL?: string;
}
