import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useUser, useSession } from '@clerk/clerk-expo';
import { getSupabaseClient } from '../lib/supabase';

interface DailyGoalSettingProps {
  onGoalUpdated?: (goal: number) => void;
}

export function DailyGoalSetting({ onGoalUpdated }: DailyGoalSettingProps) {
  const { user } = useUser();
  const { session } = useSession();
  const [dailyGoal, setDailyGoal] = useState<string>('');
  const [currentGoal, setCurrentGoal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  // Function to get a fresh Clerk session token
  const getFreshToken = async () => {
    if (!session) return null;
    
    try {
      // Get a fresh token each time
      const token = await session.getToken();
      setSessionToken(token);
      return token;
    } catch (err) {
      console.error('Error getting session token:', err);
      return null;
    }
  };
  
  // Initial token fetch when session changes
  useEffect(() => {
    getFreshToken();
  }, [session]);

  // Fetch the current goal when the component mounts
  useEffect(() => {
    if (user && session) {
      fetchCurrentGoal();
    }
  }, [user, session]);
  
  // Save default goal of 5 minutes for new users
  const saveDefaultGoal = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      const defaultGoalMinutes = 5;
      
      // Get a fresh token before making the request
      const freshToken = await getFreshToken();
      if (!freshToken) {
        throw new Error('Unable to get authentication token');
      }
      
      // Insert new default goal with fresh token
      const supabase = getSupabaseClient(freshToken);
      const result = await supabase
        .from('user_goals')
        .insert({ 
          user_id: user.id, 
          daily_goal_minutes: defaultGoalMinutes,
          created_at: new Date(),
          updated_at: new Date()
        });
      
      if (result.error) throw result.error;
      
      console.log('Default goal saved successfully');
      
      if (onGoalUpdated) {
        onGoalUpdated(defaultGoalMinutes);
      }
    } catch (err: any) {
      console.error('Error saving default goal:', err);
      // Don't show error to user for default goal setting
    } finally {
      setIsSaving(false);
    }
  };

  const fetchCurrentGoal = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get a fresh token before making the request
      const freshToken = await getFreshToken();
      if (!freshToken) {
        throw new Error('Unable to get authentication token');
      }
      
      // Use the authenticated Supabase client with fresh token
      const supabase = getSupabaseClient(freshToken);
      
      const { data, error } = await supabase
        .from('user_goals')
        .select('daily_goal_minutes')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setCurrentGoal(data.daily_goal_minutes);
        setDailyGoal(data.daily_goal_minutes.toString());
      }
    } catch (err: any) {
      console.error('Error fetching goal:', err);
      // If the error is because the record doesn't exist, set a default goal
      // PGRST116 means no rows found, which is expected for new users
      if (err?.code !== 'PGRST116') {
        setError('Failed to load your daily goal. Please try again.');
      } else {
        console.log('No goal found for user - setting default goal of 5 minutes');
        // Set default goal of 5 minutes
        setCurrentGoal(5);
        setDailyGoal('5');
        // Save the default goal to Supabase
        saveDefaultGoal();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveGoal = async () => {
    if (!user) {
      setError('You must be signed in to save a goal');
      return;
    }
    
    // Validate input
    const goalMinutes = parseInt(dailyGoal, 10);
    if (isNaN(goalMinutes) || goalMinutes <= 0) {
      setError('Please enter a valid number of minutes greater than 0');
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Get a fresh token before making the request
      const freshToken = await getFreshToken();
      if (!freshToken) {
        throw new Error('Unable to get authentication token');
      }
      
      // Use the authenticated Supabase client with fresh token
      const supabase = getSupabaseClient(freshToken);
      
      // Check if the user already has a goal
      const { data: existingData, error: checkError } = await supabase
        .from('user_goals')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      // PGRST116 means no rows found, which is expected for new users
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing goal:', checkError);
        throw checkError;
      }
      
      // Get a fresh token again before the next operation
      // This is important for longer operations where the token might expire
      const freshTokenForUpdate = await getFreshToken();
      if (!freshTokenForUpdate) {
        throw new Error('Unable to get authentication token');
      }
      
      // Create a new client with the fresh token
      const supabaseForUpdate = getSupabaseClient(freshTokenForUpdate);
      let result;
      
      if (existingData) {
        // Update existing goal
        result = await supabaseForUpdate
          .from('user_goals')
          .update({ daily_goal_minutes: goalMinutes, updated_at: new Date() })
          .eq('user_id', user.id);
      } else {
        // Insert new goal
        result = await supabaseForUpdate
          .from('user_goals')
          .insert({ 
            user_id: user.id, 
            daily_goal_minutes: goalMinutes,
            created_at: new Date(),
            updated_at: new Date()
          });
      }
      
      if (result.error) {
        console.error('Error saving goal:', result.error);
        
        // Check for permission errors (RLS)
        if (result.error.code === '42501' || result.error.message.includes('permission denied')) {
          throw new Error('Permission denied. This may be due to Row Level Security policies.');
        }
        
        throw result.error;
      }
      
      console.log('Goal saved successfully:', goalMinutes);
      setCurrentGoal(goalMinutes);
      if (onGoalUpdated) {
        onGoalUpdated(goalMinutes);
      }
    } catch (err: any) {
      console.error('Error saving goal:', err);
      setError('Failed to save your daily goal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#0000ff" />
        <Text style={styles.loadingText}>Loading your daily goal...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Your Daily Goal</Text>
      
      {currentGoal !== null && (
        <Text style={styles.currentGoal}>
          Current goal: <Text style={styles.goalValue}>{currentGoal} minutes</Text> per day
        </Text>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={dailyGoal}
          onChangeText={setDailyGoal}
          placeholder="Enter minutes (e.g. 5)"
          keyboardType="number-pad"
        />
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={saveGoal}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  currentGoal: {
    fontSize: 16,
    marginBottom: 16,
  },
  goalValue: {
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
    height: 46,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  errorText: {
    color: 'red',
    marginTop: 8,
  },
});
