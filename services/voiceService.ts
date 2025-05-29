import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';

// Get the server URL
const isDevice = Constants.executionEnvironment === 'standalone' || Constants.executionEnvironment === 'storeClient';

// For iOS simulator, we need to use the machine's actual IP address
// This is because the simulator runs in a separate network context
const API_URL = 'http://192.168.1.245:3000';

// Note: 192.168.1.245 is your computer's actual IP address
// If you change networks or locations, you'll need to update this IP address

// Log the API URL for debugging
console.log('API URL being used:', API_URL);

/**
 * Test the connection to the ElevenLabs API
 * @returns Promise with connection status
 */
export const testElevenLabsConnection = async (): Promise<{connected: boolean, message: string}> => {
  try {
    console.log('Testing ElevenLabs API connection...');
    
    // Set up fetch with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${API_URL}/api/test-connection`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId); // Clear the timeout if fetch completes
    const data = await response.json();
    
    console.log('Connection test result:', data);
    
    if (data.connected) {
      Alert.alert('Success', `Connected to ElevenLabs API! Found ${data.voicesCount} voices.`);
    } else {
      Alert.alert('Connection Failed', data.message || 'Could not connect to ElevenLabs API');
    }
    
    return data;
  } catch (error: any) {
    console.error('Error testing connection:', error);
    
    let errorMessage = 'Failed to test ElevenLabs API connection';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Connection timed out. Make sure the server is running and accessible at ' + API_URL;
    } else if (error.message) {
      errorMessage = `${errorMessage}: ${error.message}`;
    }
    
    console.log('Error details:', errorMessage);
    Alert.alert('Connection Error', errorMessage);
    return { connected: false, message: errorMessage };
  }
};
