import { defineStore } from "pinia";
import type { EarthquakeInterface } from "~~/interfaces/earthquake.interface";

export const useEarthquakesStore = defineStore({
  id: "earthquakes-store",
  state: () => {
    return {
      allEarthquakes: [] as Array<EarthquakeInterface>,
      lastEarthquakes: [] as Array<EarthquakeInterface>,
      favoriteCities: (typeof window !== 'undefined' && localStorage.getItem('zelzele.favorites'))
        ? JSON.parse(localStorage.getItem('zelzele.favorites')!)
        : [] as string[],
    };
  },
  actions: {
    setAllEarthquakes(val: Array<EarthquakeInterface>) {
      this.allEarthquakes = val;
    },
    setLastEarthquakes(val: Array<EarthquakeInterface>) {
      this.lastEarthquakes = val;
    },
    addFavoriteCity(city: string) {
      if (!this.favoriteCities.includes(city)) {
        this.favoriteCities.push(city);
        localStorage.setItem('zelzele.favorites', JSON.stringify(this.favoriteCities));
      }
    },
    removeFavoriteCity(city: string) {
      this.favoriteCities = this.favoriteCities.filter(c => c !== city);
      localStorage.setItem('zelzele.favorites', JSON.stringify(this.favoriteCities));
    },
  },
  getters: {
    getAllEarthQuakes: (state) => state.allEarthquakes,
    getLastEarthquakes: (state) => state.lastEarthquakes,
    getFavoriteCities: (state) => state.favoriteCities,
  },
});
