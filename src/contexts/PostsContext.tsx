// Import React and the necessary hooks from react, with TypeScript support.
import React, { useContext, createContext, useState,  ReactNode } from 'react';
import { Timestamp } from "firebase/firestore";

export interface Post {
    id:string;
    city: string;
    content: string;
    timestamp: Timestamp | null; // Conside using a speficic type like Date or firebase.firestore.Timestamp
    imageUrl: string;
    videoUrl: string | null; // Add videoUrl to Post interface
    user: {
        uid: string;
        name: string;
        avatar: string;
    };
    likedBy?: string[];
    categoryKey: string;
    commentCount?: number;
    commentsEnabled: boolean;
}

// Define the type for the posts and the context structure
interface PostContextType {
    posts: Post[]; // Assuming posts are identified by strings;
    setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
    activePostId: string | null;
    setActivePostId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const PostsContext = createContext<PostContextType | undefined>(undefined);

interface PostsProviderProps {
    children: ReactNode;    // Using ReactNode to type the children prop
}

 // Define a provider component for the PostContext that wraps children components.
export const PostsProvider = ({ children }: PostsProviderProps) => {
    // State hook to manage the list of posts.
    const [posts, setPosts] = useState<Post[]>([]);
    const [activePostId, setActivePostId] = useState<string | null>(null);

    // Provide the posts array and the function to modify it to children components.
    return (
        <PostsContext.Provider value={{ posts, setPosts, activePostId, setActivePostId }}>
        {children}
        </PostsContext.Provider>
    );
};

// Custom hook to use the PostsContext
export const usePosts = () => {
    const context = useContext(PostsContext);
    if (context === undefined) {
        throw new Error('usePosts must be used within a PostsProvider');
    }
    return context;
};