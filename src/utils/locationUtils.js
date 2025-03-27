// locationUtils.js

export const locationMapping = [
    {
      city: "Ventanilla",
      region: "Callao",
      bounds: {
        latitude: { min: -12.1, max: -11.872 },
        longitude: { min: -77.15, max: -77.09 }
      }
    },
    {
        city: "Puente Piedra",
        region: "Lima",
        bounds: {
            latitude: { min: -11.8768, max: -11.8516 },
            longitude: { min: -77.09, max: -77.0744 }
        }
    }
  ];
  
  export function checkLocation(coords) {
    const { latitude, longitude } = coords;
    const matchedLocation = locationMapping.find(location => 
      latitude >= location.bounds.latitude.min &&
      latitude <= location.bounds.latitude.max &&
      longitude >= location.bounds.longitude.min &&
      longitude <= location.bounds.longitude.max
    );
  
    return matchedLocation ? `${matchedLocation.city}, ${matchedLocation.region}` : null;
  }
  