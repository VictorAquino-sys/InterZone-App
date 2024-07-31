import React, { createContext, useState, useContext } from 'react';

export const UserContext = createContext({
  user: {
    name: 'Default User',
    avatar: 'https://via.placeholder.com/150'
  },
  setUser: () => {}
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({
    name: 'Default User',
    avatar: 'https://via.placeholder.com/150' // Default or placeholder image
  });

  const updateUser = (newDetails) => {
    console.log("Before update:", user);
    setUser(newDetails);
    console.log("After update:", newDetails);
  }

  return (
    <UserContext.Provider value={{ user, setUser: updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);