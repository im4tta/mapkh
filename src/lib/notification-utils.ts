import { addDoc, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notification, UserInfo } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

/**
 * Send notification to users when they are mentioned in a post
 */
export async function sendMentionNotifications(
  mentionedUserNames: string[],
  postId: string,
  postText: string,
  mentioningUser: UserInfo
): Promise<void> {
  try {
    // Get user UIDs for mentioned users by name
    const usersQuery = query(
      collection(db, 'users'),
      where('displayName', 'in', mentionedUserNames)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    const mentionedUserIds: string[] = [];
    
    usersSnapshot.forEach(doc => {
      mentionedUserIds.push(doc.id);
    });

    // Create notifications for each mentioned user
    const notificationPromises = mentionedUserIds.map(async (userId) => {
      const notification: Omit<Notification, 'id'> = {
        userId: userId,
        type: 'mention',
        title: `${mentioningUser.name} mentioned you`,
        message: `"${postText.length > 100 ? postText.substring(0, 100) + '...' : postText}"`,
        reportId: postId, // Using postId as reportId for consistency
        reportDetails: JSON.stringify({
          postId,
          postText,
          mentioningUser,
          category: 'mentions'
        }),
        read: false,
        createdAt: Timestamp.now()
      };

      return addDoc(collection(db, 'notifications'), notification);
    });

    await Promise.all(notificationPromises);

    // Also check if this post is a reply or mention of another post and notify the owner
    await checkAndNotifyPostOwners(postText, postId, mentioningUser);
  } catch (error) {
    console.error('Error sending mention notifications:', error);
  }
}

/**
 * Check if the post text mentions other posts and notify their owners
 */
async function checkAndNotifyPostOwners(
  postText: string,
  currentPostId: string,
  mentioningUser: UserInfo
): Promise<void> {
  try {
    // Look for patterns that might reference other posts
    // This is a simple implementation - you might want to enhance this
    const postReferencePattern = /@post:(\w+)/g;
    const matches = [...postText.matchAll(postReferencePattern)];
    
    for (const match of matches) {
      const referencedPostId = match[1];
      if (referencedPostId !== currentPostId) {
        // Get the referenced post to find its owner
        const postDoc = await getDoc(doc(db, 'posts', referencedPostId));
        if (postDoc.exists()) {
          const postData = postDoc.data();
          const postOwnerId = postData.user?.uid;
          
          if (postOwnerId && postOwnerId !== mentioningUser.uid) {
            await sendOwnerMentionNotification(
              postOwnerId,
              postText,
              mentioningUser,
              currentPostId
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking post owner notifications:', error);
  }
}

/**
 * Send notification when someone replies to a post
 */
export async function sendReplyNotification(
  originalPostUserId: string,
  replyText: string,
  replyingUser: UserInfo,
  originalPostId: string
): Promise<void> {
  try {
    // Don't send notification if user is replying to their own post
    if (originalPostUserId === replyingUser.uid) {
      return;
    }

    const notification: Omit<Notification, 'id'> = {
      userId: originalPostUserId,
      type: 'reply',
      title: `${replyingUser.name} replied to your post`,
      message: `"${replyText.length > 100 ? replyText.substring(0, 100) + '...' : replyText}"`,
      reportId: originalPostId,
      reportDetails: JSON.stringify({
        replyText,
        replyingUser,
        originalPostId,
        category: 'mentions'
      }),
      read: false,
      createdAt: Timestamp.now()
    };

    await addDoc(collection(db, 'notifications'), notification);
  } catch (error) {
    console.error('Error sending reply notification:', error);
  }
}

/**
 * Send notification to post owner when their post receives a mention
 */
export async function sendOwnerMentionNotification(
  postOwnerId: string,
  mentionText: string,
  mentioningUser: UserInfo,
  postId: string
): Promise<void> {
  try {
    // Don't send notification if user is mentioning their own post
    if (postOwnerId === mentioningUser.uid) {
      return;
    }

    const notification: Omit<Notification, 'id'> = {
      userId: postOwnerId,
      type: 'mention',
      title: `${mentioningUser.name} mentioned your post`,
      message: `"${mentionText.length > 100 ? mentionText.substring(0, 100) + '...' : mentionText}"`,
      reportId: postId,
      reportDetails: JSON.stringify({
        postId,
        mentionText,
        mentioningUser,
        type: 'owner_mention',
        category: 'mentions'
      }),
      read: false,
      createdAt: Timestamp.now()
    };

    await addDoc(collection(db, 'notifications'), notification);
  } catch (error) {
    console.error('Error sending owner mention notification:', error);
  }
}

/**
 * Send push notification to mentioned users (if they have FCM tokens)
 */
export async function sendMentionPushNotifications(
  mentionedUserNames: string[],
  postText: string,
  mentioningUser: UserInfo
): Promise<void> {
  try {
    // This would integrate with your existing push notification system
    console.log('Push notifications would be sent to:', mentionedUserNames);
  } catch (error) {
    console.error('Error sending mention push notifications:', error);
  }
}