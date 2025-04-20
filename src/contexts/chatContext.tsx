import React, { createContext, useState, useContext } from 'react';

/**
 * ChatContext tracks the currently viewed conversation.
 * Used to suppress push notifications if already viewing the chat.
 */
type ChatContextType = {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
};

const ChatContext = createContext<ChatContextType>({
  activeConversationId: null,
  setActiveConversationId: () => {},
});

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  return (
    <ChatContext.Provider value={{ activeConversationId, setActiveConversationId }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);
