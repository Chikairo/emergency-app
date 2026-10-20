export function incidentMapEmbedUrl(latitude: number, longitude: number): string {
  const mapLatitude = Math.max(-85, Math.min(85, latitude));
  const latitudeOffset = 0.006;
  const longitudeOffset = 0.009;
  const south = Math.max(-85, mapLatitude - latitudeOffset);
  const north = Math.min(85, mapLatitude + latitudeOffset);
  const west = Math.max(-180, longitude - longitudeOffset);
  const east = Math.min(180, longitude + longitudeOffset);
  const params = new URLSearchParams({
    bbox: `${west},${south},${east},${north}`,
    layer: "mapnik",
    marker: `${latitude},${longitude}`,
  });
  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}
