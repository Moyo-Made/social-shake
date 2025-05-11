"use client";

import { createContext, useContext, useState } from "react";

const NotificationsContext = createContext<{
  totalUnreadCount: number;
  setTotalUnreadCount: React.Dispatch<React.SetStateAction<number>>;
}>({
  totalUnreadCount: 0,
  setTotalUnreadCount: () => {}
});

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  return (
    <NotificationsContext.Provider value={{ totalUnreadCount, setTotalUnreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);