import Constants from 'expo-constants';
import { Alert } from 'react-native';

// Get the server URL
const isDevice = Constants.executionEnvironment === 'standalone' || Constants.executionEnvironment === 'storeClient';
const API_URL = isDevice ? 'http://10.10.10.227:3000' : 'http://localhost:3000';

/**
 * Test the connection to the ElevenLabs API
 * @returns Promise with connection status
 */
export const testElevenLabsConnection = async (): Promise<{connected: boolean, message: string}> => {
  try {
    console.log('Testing ElevenLabs API connection...');
    
    const response = await fetch(`${API_URL}/api/test-connection`);
    const data = await response.json();
    
    console.log('Connection test result:', data);
    
    if (data.connected) {
      Alert.alert('Success', `Connected to ElevenLabs API! Found ${data.voicesCount} voices.`);
    } else {
      Alert.alert('Connection Failed', data.message || 'Could not connect to ElevenLabs API');
    }
    
    return data;
  } catch (error) {
    console.error('Error testing connection:', error);
    Alert.alert('Connection Error', 'Failed to test ElevenLabs API connection. Check server logs.');
    return { connected: false, message: 'Connection test failed' };
  }
};
