import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Enhanced AsyncStorage adapter for Supabase with error handling
const AsyncStorageAdapter = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      // Silently handle storage errors in simulator
      console.log('AsyncStorage getItem error (safe to ignore in simulator):', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
      return;
    } catch (error) {
      // Silently handle storage errors in simulator
      console.log('AsyncStorage setItem error (safe to ignore in simulator):', error);
      // Return void instead of null to match the expected type
      return;
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
      return;
    } catch (error) {
      // Silently handle storage errors in simulator
      console.log('AsyncStorage removeItem error (safe to ignore in simulator):', error);
      // Return void instead of null to match the expected type
      return;
    }
  },
};

// Initialize Supabase with hardcoded values from .env
const supabaseUrl = 'https://ekltgnpetdtqxqpqhaos.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbHRnbnBldGR0cXhxcHFoYW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDAzMjQsImV4cCI6MjA2MzU3NjMyNH0.WlYQ-nTCVyzY4IS6u41pFteL4LT0zAWtPHT9cRDH1-w';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or anon key');
}

// Basic Supabase client without auth
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  localStorage: AsyncStorageAdapter,
  detectSessionInUrl: false,
});

// Create a function to get a Supabase client with the Clerk session token
export function getSupabaseClient(sessionToken: string | null) {
  // If we have a session token, create an authenticated client
  if (sessionToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      localStorage: AsyncStorageAdapter,
      detectSessionInUrl: false,
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  }
  
  // Otherwise, return the basic client
  return supabaseClient;
}

// Export the basic client for non-authenticated operations
export const supabase = supabaseClient;
