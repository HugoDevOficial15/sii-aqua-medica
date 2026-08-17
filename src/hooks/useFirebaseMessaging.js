import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { usePushNotifications } from './usePushNotifications';

export function useFirebaseMessaging() {
  const { user } = useAuth();
  usePushNotifications(user);
}
