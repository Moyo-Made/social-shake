import { useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';

// Define common response types
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useAuthApi() {
  const [loading, setLoading] = useState<boolean>(false);

  // Helper function to get auth token
  const getAuthToken = async (): Promise<string> => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    return await user.getIdToken();
  };
  
  // Generic authenticated fetch that handles common patterns
  const authFetch = useCallback(async <T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    setLoading(true);
    
    try {
      const token = await getAuthToken();
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      };
      
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return { data, error: null, loading: false };
    } catch (error) {
      console.error('API request failed:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        loading: false 
      };
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Convenience methods for common HTTP methods
  const get = useCallback(<T>(url: string) => {
    return authFetch<T>(url);
  }, [authFetch]);
  
  const post = useCallback(<T>(url: string, data: Record<string, unknown>) => {
    return authFetch<T>(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }, [authFetch]);
  
  const put = useCallback(<T>(url: string, data: Record<string, unknown>) => {
    return authFetch<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }, [authFetch]);
  
  const del = useCallback(<T>(url: string) => {
    return authFetch<T>(url, {
      method: 'DELETE'
    });
  }, [authFetch]);
  
  return {
    loading,
    get,
    post,
    put,
    delete: del,
    authFetch
  };
}

