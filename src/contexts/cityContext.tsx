import React, { createContext, useContext, useState, ReactNode } from 'react';

type CityContextType = {
  city: string | null;
  setCity: React.Dispatch<React.SetStateAction<string | null>>;
  country: string | null;
  setCountry: React.Dispatch<React.SetStateAction<string | null>>;
};

const CityContext = createContext<CityContextType | undefined>(undefined);

export const CityProvider = ({ children }: { children: ReactNode }) => {
  const [city, setCity] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);

  return (
    <CityContext.Provider value={{ city, setCity, country, setCountry }}>
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error("useCity must be used within a CityProvider");
  }
  return context;
};