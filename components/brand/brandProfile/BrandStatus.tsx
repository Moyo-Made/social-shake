import React, { useEffect, useState } from 'react';
import { BrandStatus } from '@/types/user';
import { useAuth } from '@/context/AuthContext';

interface BrandStatusProps {
  email: string;
  onStatusChange?: (status: BrandStatus) => void;
}

interface Notification {
  id: string;
  message: string;
  createdAt: string;
  type: string;
  status: 'read' | 'unread';
}

interface BrandStatusData {
  status: BrandStatus;
  notifications: Notification[];
  brandProfile: {
    companyName: string;
    logoUrl?: string;
    rejectionReason?: string;
    requestedInfo?: string;
  };
}

const BrandStatusComponent: React.FC<BrandStatusProps> = ({ email, onStatusChange }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<BrandStatusData | null>(null);

  const { currentUser } = useAuth() as { currentUser: { getIdToken: () => Promise<string> } | null };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        // Get the authentication token
      const token = await currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/brand/status?email=${encodeURIComponent(email)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
        
        if (!response.ok) {
          throw new Error('Failed to fetch brand status');
        }
        
        const data = await response.json();
        setStatusData(data);
        
        if (onStatusChange && data.status) {
          onStatusChange(data.status);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching brand status:', err);
      } finally {
        setLoading(false);
      }
    };

    if (email) {
      fetchStatus();
    }
  }, [email, onStatusChange]);

  const markNotificationsAsRead = async () => {
    if (!statusData?.notifications || statusData.notifications.length === 0) return;
    
    try {
      const notificationIds = statusData.notifications
        .filter(n => n.status === 'unread')
        .map(n => n.id);
      
      if (notificationIds.length === 0) return;
      
      const response = await fetch('/api/brand/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }
      
      // Update local state
      setStatusData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          notifications: prev.notifications.map(n => ({
            ...n,
            status: 'read',
          })),
        };
      });
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  if (loading) {
    return <div className="p-4 bg-gray-50 rounded-lg">Loading status...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-lg">Error: {error}</div>;
  }

  if (!statusData) {
    return <div className="p-4 bg-gray-50 rounded-lg">No status information available</div>;
  }

  const renderStatusContent = () => {
    switch (statusData.status) {
      case BrandStatus.PENDING:
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
              <h3 className="text-lg font-medium text-yellow-800">Pending Approval</h3>
            </div>
            <p className="text-yellow-700">
              Your brand profile is currently under review. We&apos;ll notify you once it&apos;s approved.
            </p>
          </div>
        );
      
      case BrandStatus.APPROVED:
        return (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="inline-block w-3 h-3 bg-green-400 rounded-full mr-2"></span>
              <h3 className="text-lg font-medium text-green-800">Approved</h3>
            </div>
            <p className="text-green-700">
              Your brand profile has been approved! You can now create projects and contests.
            </p>
          </div>
        );
      
      case BrandStatus.REJECTED:
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="inline-block w-3 h-3 bg-red-400 rounded-full mr-2"></span>
              <h3 className="text-lg font-medium text-red-800">Not Approved</h3>
            </div>
            <p className="text-red-700">
              {statusData.brandProfile.rejectionReason || 
                "Your brand profile was not approved. Please contact support for more information."}
            </p>
          </div>
        );
      
      case BrandStatus.INFO_REQUESTED:
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="inline-block w-3 h-3 bg-blue-400 rounded-full mr-2"></span>
              <h3 className="text-lg font-medium text-blue-800">Additional Information Needed</h3>
            </div>
            <p className="text-blue-700">
              {statusData.brandProfile.requestedInfo || 
                "We need additional information about your brand. Please update your profile."}
            </p>
            <button 
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              onClick={() => window.location.href = '/dashboard/brand/edit-profile'}
            >
              Update Profile
            </button>
          </div>
        );
      
      default:
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-700">Status information unavailable</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {renderStatusContent()}
      
      {statusData.notifications && statusData.notifications.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">Notifications</h3>
            <button 
              className="text-sm text-blue-600 hover:underline"
              onClick={markNotificationsAsRead}
            >
              Mark all as read
            </button>
          </div>
          <div className="space-y-2">
            {statusData.notifications.map(notification => (
              <div 
                key={notification.id} 
                className={`p-3 rounded-lg ${notification.status === 'unread' ? 'bg-blue-50' : 'bg-gray-50'}`}
              >
                <p className="text-gray-800">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandStatusComponent;