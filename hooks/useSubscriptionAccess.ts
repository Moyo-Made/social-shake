import { useMemo } from 'react';

// Types based on your subscription endpoint
interface SubscriptionData {
  id: string;
  userId: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'pending' | 'processing';
  stripeSubscriptionId?: string;
  planType: string;
  amount: number;
  currency: string;
  trialStart?: string | null;
  trialEnd?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface CustomerData {
  id?: string;
  email?: string | null;
  name?: string | null;
}

interface UseSubscriptionAccessProps {
  subscriptionData?: SubscriptionData | null;
  customerData?: CustomerData | null;
  loading?: boolean;
  error?: string | null;
}

interface UseSubscriptionAccessReturn {
  // Access permissions
  canCreateNew: boolean;
  canModifyExisting: boolean;
  canAccessPremiumFeatures: boolean;
  
  // Subscription state
  isSubscribed: boolean;
  isInTrial: boolean;
  isTrialExpired: boolean;
  isActive: boolean;
  isPastDue: boolean;
  
  // Trial information
  trialDaysLeft: number;
  trialEndsAt: Date | null;
  
  // Billing information
  nextBillingDate: Date | null;
  willCancelAtPeriodEnd: boolean;
  
  // UI helpers
  subscriptionStatusMessage: string;
  blockMessage: string;
  upgradeRequired: boolean;
  
  // Raw data
  subscriptionData?: SubscriptionData | null;
  customerData?: CustomerData | null;
  loading: boolean;
  error?: string | null;
}

const useSubscriptionAccess = ({
  subscriptionData,
  customerData,
  loading = false,
  error = null
}: UseSubscriptionAccessProps): UseSubscriptionAccessReturn => {

  // Helper function to check if date is in the future
  const isFutureDate = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    try {
      return new Date(dateString) > new Date();
    } catch {
      return false;
    }
  };

  // Helper function to get days between dates
  const getDaysBetween = (fromDate: Date, toDate: Date): number => {
    const diffTime = toDate.getTime() - fromDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Computed subscription states
  const isSubscribed = useMemo(() => {
    return Boolean(subscriptionData?.stripeSubscriptionId);
  }, [subscriptionData?.stripeSubscriptionId]);

  const isInTrial = useMemo(() => {
    if (!subscriptionData) return false;
    return subscriptionData.status === 'trialing' && 
           isFutureDate(subscriptionData.trialEnd);
  }, [subscriptionData]);

  const isTrialExpired = useMemo(() => {
    if (!subscriptionData?.trialEnd) return false;
    return subscriptionData.status === 'trialing' && 
           !isFutureDate(subscriptionData.trialEnd);
  }, [subscriptionData]);

  const isActive = useMemo(() => {
    if (!subscriptionData) return false;
    return subscriptionData.status === 'active';
  }, [subscriptionData?.status]);

  const isPastDue = useMemo(() => {
    if (!subscriptionData) return false;
    return subscriptionData.status === 'past_due';
  }, [subscriptionData?.status]);

  // Trial calculations
  const trialEndsAt = useMemo(() => {
    if (!subscriptionData?.trialEnd) return null;
    try {
      return new Date(subscriptionData.trialEnd);
    } catch {
      return null;
    }
  }, [subscriptionData?.trialEnd]);

  const trialDaysLeft = useMemo(() => {
    if (!trialEndsAt || !isInTrial) return 0;
    const today = new Date();
    const daysLeft = getDaysBetween(today, trialEndsAt);
    return Math.max(0, daysLeft);
  }, [trialEndsAt, isInTrial]);

  // Billing calculations
  const nextBillingDate = useMemo(() => {
    if (!subscriptionData?.currentPeriodEnd) return null;
    try {
      return new Date(subscriptionData.currentPeriodEnd);
    } catch {
      return null;
    }
  }, [subscriptionData?.currentPeriodEnd]);

  const willCancelAtPeriodEnd = useMemo(() => {
    return Boolean(subscriptionData?.cancelAtPeriodEnd);
  }, [subscriptionData?.cancelAtPeriodEnd]);

  // Access permissions
  const canAccessPremiumFeatures = useMemo(() => {
    if (loading) return false;
    if (!subscriptionData) return false;
    
    // Allow access if actively subscribed or in valid trial
    return isActive || (isInTrial && !isTrialExpired);
  }, [loading, subscriptionData, isActive, isInTrial, isTrialExpired]);

  const canCreateNew = useMemo(() => {
    if (loading) return false;
    
    // Strict permission for creating new content
    return canAccessPremiumFeatures;
  }, [loading, canAccessPremiumFeatures]);

  const canModifyExisting = useMemo(() => {
    if (loading) return false;
    if (!subscriptionData) return false;
    
    // More permissive - allow modification unless completely blocked
    const blockedStatuses = ['canceled', 'incomplete_expired', 'unpaid'];
    
    // Allow if currently has access OR if recently expired (grace period)
    if (canAccessPremiumFeatures) return true;
    
    // Allow for past due (give them a chance to update payment)
    if (isPastDue) return true;
    
    // Block if in explicitly blocked states
    if (blockedStatuses.includes(subscriptionData.status)) return false;
    
    // For trial expired, allow modification for a few days grace period
    if (isTrialExpired && trialEndsAt) {
      const daysSinceTrialEnd = getDaysBetween(trialEndsAt, new Date());
      return daysSinceTrialEnd <= 3; // 3-day grace period
    }
    
    return false;
  }, [loading, subscriptionData, canAccessPremiumFeatures, isPastDue, isTrialExpired, trialEndsAt]);

  const upgradeRequired = useMemo(() => {
    return !canAccessPremiumFeatures && !loading;
  }, [canAccessPremiumFeatures, loading]);

  // Status messages
  const subscriptionStatusMessage = useMemo(() => {
    if (loading) return 'Loading subscription...';
    if (error) return 'Error loading subscription';
    if (!subscriptionData) return 'No active subscription';
    
    switch (subscriptionData.status) {
      case 'active':
        return willCancelAtPeriodEnd 
          ? `Active until ${nextBillingDate?.toLocaleDateString()} (will not renew)`
          : `Active • Next billing: ${nextBillingDate?.toLocaleDateString()}`;
      
      case 'trialing':
        if (isTrialExpired) {
          return 'Trial period has ended';
        }
        return `Free trial • ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining`;
      
      case 'past_due':
        return 'Payment past due • Update payment method';
      
      case 'canceled':
        return 'Subscription canceled';
      
      case 'incomplete':
        return 'Payment incomplete • Complete setup';
      
      case 'incomplete_expired':
        return 'Payment setup expired';
      
      case 'unpaid':
        return 'Payment failed • Update payment method';
      
      case 'pending':
      case 'processing':
        return 'Subscription processing...';
      
      default:
        return `Subscription ${subscriptionData.status}`;
    }
  }, [
    loading, 
    error, 
    subscriptionData, 
    willCancelAtPeriodEnd, 
    nextBillingDate, 
    isTrialExpired, 
    trialDaysLeft
  ]);

  const blockMessage = useMemo(() => {
    if (canAccessPremiumFeatures) return '';
    
    if (isTrialExpired) {
      return 'Your free trial has ended. Upgrade to continue creating new content.';
    }
    
    if (isPastDue) {
      return 'Please update your payment method to continue creating new content.';
    }
    
    if (subscriptionData?.status === 'canceled') {
      return 'Your subscription has been canceled. Reactivate to create new content.';
    }
    
    return 'Upgrade to Pro to create new campaigns and access premium features.';
  }, [canAccessPremiumFeatures, isTrialExpired, isPastDue, subscriptionData?.status]);

  return {
    // Access permissions
    canCreateNew,
    canModifyExisting,
    canAccessPremiumFeatures,
    
    // Subscription state
    isSubscribed,
    isInTrial,
    isTrialExpired,
    isActive,
    isPastDue,
    
    // Trial information
    trialDaysLeft,
    trialEndsAt,
    
    // Billing information
    nextBillingDate,
    willCancelAtPeriodEnd,
    
    // UI helpers
    subscriptionStatusMessage,
    blockMessage,
    upgradeRequired,
    
    // Raw data
    subscriptionData,
    customerData,
    loading,
    error
  };
};

export default useSubscriptionAccess;