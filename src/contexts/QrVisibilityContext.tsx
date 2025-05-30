import React, { createContext, useContext, useState } from 'react';

type QrVisibilityContextType = {
  qrVisible: boolean;
  setQrVisible: (value: boolean) => void;
};

const QrVisibilityContext = createContext<QrVisibilityContextType | undefined>(undefined);

export const QrVisibilityProvider = ({ children }: { children: React.ReactNode }) => {
  const [qrVisible, setQrVisible] = useState(false);

  return (
    <QrVisibilityContext.Provider value={{ qrVisible, setQrVisible }}>
      {children}
    </QrVisibilityContext.Provider>
  );
};

export const useQrVisibility = (): QrVisibilityContextType => {
  const context = useContext(QrVisibilityContext);
  if (!context) throw new Error('useQrVisibility must be used within a QrVisibilityProvider');
  return context;
};