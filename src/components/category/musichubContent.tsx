import React, { useState } from 'react';
import { FlatList, Text, View, TouchableOpacity, Image, Modal, StyleSheet } from 'react-native';
import Video from 'react-native-video';
import { usePosts } from '@/contexts/PostsContext';
import { useUser } from '@/contexts/UserContext';
import { useMusicHub } from './musichubContext';
import LikeButton from '@/components/LikeButton';
import Avatar from '@/components/Avatar';
import PostCard from '@/components/PostCard';
import Trivia from '@/components/Trivia';
import { useTrivia } from '@/contexts/TriviaContext';
import i18n from '@/i18n';

const MusicHubContent = () => {
    const { posts } = usePosts();
    const { user } = useUser();
    const { trivia } = useTrivia();
    const [triviaActive, setTriviaActive] = useState(false);
    const {
        selectedVideoUrl,
        isVideoModalVisible,
        videoRef,
        openVideoModal,
        closeVideoModal,
    } = useMusicHub();

    const filteredPosts = posts.filter(post => post.categoryKey === 'music');
    const toggleTrivia = () => setTriviaActive(prev => !prev);

    const renderTrivia = () => {
        const language = (user?.language || 'en') as 'en' | 'es';
        const triviaData = trivia.filter(t => t.category === 'Entertainment: Music');

        if (triviaData.length === 0) {
            return <Text style={{ margin: 10 }}>{i18n.t('NoTriviaAvailable')}</Text>;
        }

        return (
            <Trivia
            triviaData={triviaData}
            language={language}
            onTriviaComplete={toggleTrivia}
            />
        );
    };

  return (
    <>
      {!triviaActive ? (
        <>
          <TouchableOpacity style={styles.triviaButton} onPress={toggleTrivia}>
            <Text style={styles.triviaButtonText}>
              {i18n.t('testYourKnowledgeMusic')}
            </Text>
          </TouchableOpacity>

          <FlatList
            data={filteredPosts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
                if (!user) return null; // Avoid passing null
                
                return (
                    <PostCard
                    item={item}
                    userId={user.uid}
                    user={user}
                    onDelete={() => {}}
                    onReport={() => {}}
                    onOpenImage={() => {}}
                    onUserProfile={() => {}}
                    formatDate={(timestamp) =>
                        timestamp?.toDate().toLocaleString() || 'Unknown'
                    }
                    isFullScreen={false}
                    toggleFullScreen={() => {}}
                    />
                );
            }}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', marginTop: 20 }}>
                {i18n.t('EmptyCategoryScreen')}
              </Text>
            }
          />
        </>
      ) : (
        renderTrivia()
      )}
    </>
  );
};

const styles = StyleSheet.create({
  postItem: { margin: 10, padding: 10, backgroundColor: '#fff', borderRadius: 10 },
  userContainer: { flexDirection: 'row', alignItems: 'center' },
  postDetails: { marginLeft: 10 },
  userName: { fontWeight: 'bold' },
  postCity: { fontSize: 12, color: 'gray' },
  postText: { marginTop: 8 },
  postImage: { width: '100%', height: 200, marginTop: 8, borderRadius: 8 },
  videoWrapper: { marginTop: 8, width: '100%', height: 200, borderRadius: 8, overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  fullScreenModal: { flex: 1, justifyContent: 'center', backgroundColor: '#000' },
  fullScreenVideo: { width: '100%', height: '100%' },
  triviaButton: {
    padding: 10,
    margin: 12,
    borderRadius: 8,
    backgroundColor: '#26c6da',
    alignItems: 'center',
  },
  triviaButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default MusicHubContent;
