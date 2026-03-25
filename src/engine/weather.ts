import type { Weather } from '../models/types';

const WEATHERS: Weather[] = ['soleil', 'nuages', 'pluie'];

export function randomWeather(exclude?: Weather): Weather {
  const options = exclude ? WEATHERS.filter(w => w !== exclude) : WEATHERS;
  return options[Math.floor(Math.random() * options.length)];
}

export function randomWeatherInterval(min = 1000, max = 2000): number {
  return Math.floor(min + Math.random() * (max - min));
}
