// locationUtils.js

export const locationMapping = [
  {
    city: "Ancon",
    region: "Lima",
    bounds: {
      latitude: { min: -11.817206009041655, max: -11.730198225508747 },
      longitude: { min: -77.19830558063897, max: -77.13950711684538 }
    }
  },
  {
    city: "Ciudad Pachacutec",
    region: "Callao",
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
    city: "San Martin de Porres",
    region: "Lima",
    bounds: {
        latitude: { min: -12.038565306524266, max: -11.937226989067794 },
        longitude: { min: -77.0950, max: -77.04380759740644 } // adjusted western boundary
      }
  },
  {
    city: "Callao",
    region: "Callao",
    bounds: { 
      latitude: { min: -12.05291, max: -11.981055470497372 },
      longitude: { min: -77.17018082063697, max: -77.0950 } // adjusted eastern boundary
    }
  },
  {
    city: "La Perla",
    region: "Callao",
    bounds: {
      latitude: { min: -12.079405854005051, max: -12.063353709120369 },
      longitude: { min: -77.13267369243474, max: -77.104371024003 }
    }
  },
  {
    city: "Bellavista",
    region: "Callao",
    bounds: {
      latitude: { min: -12.067135846259314, max: -12.052111219121988 },
      longitude: { min: -77.13334837197381, max: -77.1000 }
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
    city: "Los Olivos",
    region: "Lima",
    bounds: {
        latitude: { min: -12.012183023772721, max: -11.931904792605645 },
        longitude: { min: -77.08714870008724, max: -77.06031773009111 }
    }
  },
  {
    city: "Rimac",
    region: "Lima",
    bounds: {
      latitude: { min: -12.043252300132176, max: -11.998360789685263 },
      longitude: { min: -77.05276192339355, max: -77.0131672813164 }
    }
  },
  {
    city: "Lima",
    region: "Provincia de Lima",
    bounds: {
      latitude: { min: -12.0675, max: -12.0351 },
      longitude: { min: -77.0880, max: -77.0179 }
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
    city: "San Miguel",
    region: "Lima",
    bounds: {
      latitude: { min: -12.09716803203449, max: -12.06049042620012 },
      longitude: { min: -77.1000, max: -77.07222837043251 }
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
    city: "Jesus Maria",
    region: "Lima",
    bounds: {
      latitude: { min: -12.092817, max: -12.064553 },
      longitude: { min: -77.062867, max: -77.036700 }
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
    city: "Barranco",
    region: "Lima",
    bounds: {
      latitude: { min: -12.157304488161095, max: -12.130902947945863 },
      longitude: { min: -77.02954150765831, max: -77.01284743902683 }
    }
  },
  {
    city: "Chorrillos",
    region: "Lima",
    bounds: {
      latitude: { min: -12.230289751137503, max: -12.154826534050303 },
      longitude: { min: -77.03967273584827, max: -76.97362072518618 }
    }
  },
  {
    city: "San Juan de Lurigancho",
    region: "Provincia de Lima",
    bounds: {
      latitude: { min: -12.034669604486496, max: -11.91712201307889 },
      longitude: { min: -77.02839829487948, max: -76.95518471696566 }
    }
  },
  {
    city: "Villa el Salvador",
    region: "Lima",
    bounds: {
      latitude: { min: -12.25184429176479, max: -12.183183007391172 },
      longitude: { min: -76.9766471074446, max: -76.91120120703484 }
    }
  },
  {
    city: "Carabayllo",
    region: "Lima",
    polygon: [
      { latitude: -11.903529353801476, longitude: -77.03521171259737 },
      { latitude: -11.907476620505726, longitude: -77.02946105640375 },
      { latitude: -11.904453187317939, longitude: -77.0223371091788 },
      { latitude: -11.897902300037318, longitude: -77.01718726781138 },
      { latitude: -11.890091420494329, longitude: -76.99590125682603 },
      { latitude: -11.876148863274851, longitude: -76.9867173730541 },
      { latitude: -11.845237517916788, longitude: -76.9847432672976 },
      { latitude: -11.817364705470832, longitude: -76.99712141839329 },
      { latitude: -11.80677904728966, longitude: -77.01609000076333 },
      { latitude: -11.80929947919012, longitude: -77.03789099588542 },
      { latitude: -11.81005560416657, longitude: -77.0555721173929 },
      { latitude: -11.81526440892112, longitude: -77.08183630836677 },
      { latitude: -11.83030217675172, longitude: -77.0836387527385 },
      { latitude: -11.84332303940875, longitude: -77.07617148275573 },
      { latitude: -11.848531210770302, longitude: -77.06973418104644 },
      { latitude: -11.857828388851678, longitude: -77.05900847696539 },
      { latitude: -11.866900141180414, longitude: -77.05583274143292 },
      { latitude: -11.884958749615326, longitude: -77.05265700589358 },
      { latitude: -11.893105729810305, longitude: -77.0458763815902 },
      { latitude: -11.894118512209602, longitude: -77.03979474084755 },
      { latitude: -11.904280859994254, longitude: -77.03344326982773 }
    ]
  },
  {
    city: "Mi Peru",
    region: "Callao",
    polygon: [
      { latitude: -11.861916299529138, longitude: -77.12840280389715 },
      { latitude: -11.861853301139064, longitude: -77.12896070337862 },
      { latitude: -11.859501350833106, longitude: -77.1304198250994 },
      { latitude: -11.85612038674961, longitude: -77.13011941768629 },
      { latitude: -11.852025374074927, longitude: -77.12893924572928 },
      { latitude: -11.849820341857392, longitude: -77.12662181711393 },
      { latitude: -11.849862342637419, longitude: -77.12316713186328 },
      { latitude: -11.848329309880535, longitude: -77.119841192689 },
      { latitude: -11.84620825050973, longitude: -77.11881122441552 },
      { latitude: -11.844423187781091, longitude: -77.1175666794184 },
      { latitude: -11.842491106742816, longitude: -77.11537799683724 },
      { latitude: -11.842554109600858, longitude: -77.11409053649538 },
      { latitude: -11.84450719099456, longitude: -77.11351117934154 },
      { latitude: -11.846397256468661, longitude: -77.11385450209937 },
      { latitude: -11.84719528018677, longitude: -77.11398324813355 },
      { latitude: -11.84847631338498, longitude: -77.11409053649538 },
      { latitude: -11.849022325708685, longitude: -77.11389741744411 },
      { latitude: -11.851374366417215, longitude: -77.1123524650402 },
      { latitude: -11.854860389330739, longitude: -77.11267433012567 },
      { latitude: -11.857023381166412, longitude: -77.11406907882936 },
      { latitude: -11.858976359148281, longitude: -77.11632213439819 },
      { latitude: -11.860404334142785, longitude: -77.11754522172295 },
      { latitude: -11.861370312989237, longitude: -77.1185966476688 },
      { latitude: -11.862399286693707, longitude: -77.11964807361466 },
      { latitude: -11.863386257901007, longitude: -77.12067804184815 },
      { latitude: -11.864352226187648, longitude: -77.12196550219001 },
      { latitude: -11.863638249957779, longitude: -77.12280235141222 },
      { latitude: -11.862546282696991, longitude: -77.12318858951477 },
      { latitude: -11.861496310054566, longitude: -77.12340316623843 },
      { latitude: -11.86023633754917, longitude: -77.12344608158314 },
      { latitude: -11.859207355686614, longitude: -77.1234246239108 },
      { latitude: -11.859679847840043, longitude: -77.12471208425264 },
      { latitude: -11.860120839778357, longitude: -77.12561330649194 },
      { latitude: -11.86060383013101, longitude: -77.1269007668338 },
      { latitude: -11.860897823840082, longitude: -77.12776980256456 },
      { latitude: -11.86109731939079, longitude: -77.12827405786511 },
      { latitude: -11.861128818674935, longitude: -77.12835988855457 },
      { latitude: -11.861695805167606, longitude: -77.1283491597184 },
      { latitude: -11.861863800939124, longitude: -77.12845644808021 },
      { latitude: -11.861916299596503, longitude: -77.12884268618276 }
    ]
  },
];
  
function isPointInPolygon(point, polygon) {
  let inside = false;
  const x = point.latitude, y = point.longitude;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].latitude, yi = polygon[i].longitude;
    const xj = polygon[j].latitude, yj = polygon[j].longitude;
    const intersect =
      ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function checkLocation(coords) {
  const { latitude, longitude } = coords;
  const matchedLocation = locationMapping.find(location => {
    if (location.polygon) {
      // Use polygon check if polygon exists
      return isPointInPolygon({ latitude, longitude }, location.polygon);
    } else if (location.bounds) {
      // Otherwise, use bounding box
      return (
        latitude >= location.bounds.latitude.min &&
        latitude <= location.bounds.latitude.max &&
        longitude >= location.bounds.longitude.min &&
        longitude <= location.bounds.longitude.max
      );
    }
    return false;
  });

  return matchedLocation ? `${matchedLocation.city}, ${matchedLocation.region}` : null;
}
  