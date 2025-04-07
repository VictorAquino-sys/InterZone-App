// locationUtils.js

export const locationMapping = [
  {
    city: "Ciudad Pachacutec",
    region: "Lima",
    bounds: {
        latitude: { min: -11.858844974971413, max: -11.821767492420388 },
        longitude: { min: -77.18510401578465, max: -77.12648740408099 }
    }
  },
  {
    city: "Ventanilla",
    region: "Callao",
    bounds: {
      latitude: { min: -11.9459, max: -11.85890 },
      longitude: { min: -77.15, max: -77.09 }
    }
  },
  {
    city: "Callao",
    region: "Callao",
    bounds: {
      latitude: { min: -12.077089700759503, max: -11.981055470497372 },
      longitude: { min: -77.17018082063697, max: -77.0821185337119 }
    }
  },
  {
    city: "Puente Piedra",
    region: "Lima",
    bounds: {
        latitude: { min: -11.8768, max: -11.8516 },
        longitude: { min: -77.09, max: -77.0744 }
    }
  },
  {
    city: "Surquillo",
    region: "Lima",
    bounds: {
      latitude: { min: -12.125983638573148, max: -12.10296878205531 },
      longitude: { min: -77.0272334306012, max: -76.99464440195062 }
    }
  },
  {
    city: "San Isidro",
    region: "Lima",
    bounds: {
      latitude: { min: -12.111014427925095, max: -12.088711664604169 },
      longitude: { min: -77.06065125743169, max: -77.00799412987234 }
    }
  },
  {
    city: "Miraflores",
    region: "Lima",
    bounds: {
      latitude: { min: -12.14008085702441, max: -12.103052468195516 },
      longitude: { min: -77.05611002222805, max: -77.00175773858118 }
    }
  },
  {
    city: "Santiago de Surco",
    region: "Lima",
    bounds: {
        latitude: { min: -12.170734647761977, max: -12.078402929068423 },
        longitude: { min: -77.01766317784654, max: -76.95011442899565 }
    }
  },
  {
    city: "Los Olivos",
    region: "Lima",
    bounds: {
        latitude: { min: -12.012183023772721, max: -11.931904792605645 },
        longitude: { min: -77.08714870008724, max: -77.06031773009111 }
    }
  },
  {
    city: "San Miguel",
    region: "Lima",
    bounds: {
      latitude: { min: -12.09716803203449, max: -12.06049042620012 },
      longitude: { min: -77.11145299342755, max: -77.07222837043251 }
    }
  },
  {
    city: "Magdalena del Mar",
    region: "Lima",
    bounds: {
      latitude: { min: -12.1059217690571828, max: -12.08458672777408 },
      longitude: { min: -77.07852421301207, max: -77.06539293254693 }
    }
  },
  {
    city: "La Molina",
    region: "Lima",
    bounds: {
      latitude: { min: -12.114871912500995, max: -12.059565666676244 },
      longitude: { min: -76.96905138900209, max: -76.88546107259228 }
    }
  },
  {
    city: "San Borja",
    region: "Lima",
    bounds: {
      latitude: { min: -12.111939345853775, max: -12.080278629183972 },
      longitude: { min: -77.01193500854673, max: -76.97917505408647 }
    }
  },
  {
    city: "Ancon",
    region: "Lima",
    bounds: {
      latitude: { min: -11.817206009041655, max: -11.730198225508747 },
      longitude: { min: -77.19830558063897, max: -77.13950711684538 }
    }
  },
  {
    city: "Barranco",
    region: "Lima",
    bounds: {
      latitude: { min: -12.157304488161095, max: -12.130902947945863 },
      longitude: { min: -77.02954150765831, max: -77.01284743902683 }
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
  