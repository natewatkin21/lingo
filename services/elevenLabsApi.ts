import { Audio } from 'expo-av';

// API configuration
const getApiUrl = (): string => {
  // Check if running in development or production
  const isDev = __DEV__;
  
  // IMPORTANT: Using your computer's actual IP address
  // This overrides all other settings and uses this IP address for all platforms
  const url = 'http://192.168.1.245:3000';
  
  console.log(`[ElevenLabsApi] Using override API URL: ${url}`);
  return url;

};

const API_URL = getApiUrl();
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Sound object for playing audio
let sound: Audio.Sound | null = null;

/**
 * Test the server connection
 */
export const testServerConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`Testing server connection to ${API_URL}...`);
    
    // Set a timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(`${API_URL}/api/test-connection`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Server connection successful:', data);
      return { 
        success: true, 
        message: `Connected to server at ${API_URL}. ElevenLabs connection: ${data.connected ? 'Success' : 'Failed'}` 
      };
    } else {
      console.error('Server responded with error:', response.status);
      return { 
        success: false, 
        message: `Server responded with status ${response.status}` 
      };
    }
  } catch (error) {
    console.error('Error connecting to server:', error);
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific error types
      if (error.name === 'AbortError') {
        errorMessage = `Connection timed out after 5 seconds. Server at ${API_URL} may be unreachable.`;
      } else if (errorMessage.includes('Network request failed')) {
        errorMessage = `Network request failed. Server at ${API_URL} may be down or unreachable.`;
      }
    }
    
    return { 
      success: false, 
      message: errorMessage 
    };
  }
};

/**
 * Get the ElevenLabs API key from the server
 */
export const getApiKey = async (): Promise<string | null> => {
  try {
    console.log('Fetching ElevenLabs API key from server...');
    const response = await fetch(`${API_URL}/api/elevenlabs-key`);
    const data = await response.json();
    
    if (data.apiKey) {
      return data.apiKey;
    } else {
      console.error('No API key returned from server');
      return null;
    }
  } catch (error) {
    console.error('Error fetching ElevenLabs API key:', error);
    return null;
  }
};

/**
 * Start a conversation with the ElevenLabs agent
 */
export const startConversation = async (
  agentId: string,
  apiKey: string,
  onStatusChange?: (status: string) => void
): Promise<boolean> => {
  try {
    if (onStatusChange) onStatusChange('Connecting');
    
    // Initialize audio session
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
    });
    
    // Request permissions
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Microphone permission not granted');
    }
    
    // Start recording
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    
    if (onStatusChange) onStatusChange('Listening');
    
    // Record for 5 seconds (this would be replaced with voice activity detection in a real app)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Stop recording
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (!uri) {
      throw new Error('Failed to get recording URI');
    }
    
    if (onStatusChange) onStatusChange('Processing');
    
    // Convert recording to blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Create form data
    const formData = new FormData();
    formData.append('audio', blob, 'recording.mp3');
    
    // Send to ElevenLabs API
    const result = await fetch(`${ELEVENLABS_API_URL}/conversation/${agentId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: formData,
    });
    
    if (!result.ok) {
      const errorData = await result.json();
      throw new Error(`ElevenLabs API error: ${errorData.detail || result.statusText}`);
    }
    
    // Get response audio
    const audioBlob = await result.blob();
    const audioUri = URL.createObjectURL(audioBlob);
    
    if (onStatusChange) onStatusChange('Speaking');
    
    // Play audio response
    if (sound) {
      await sound.unloadAsync();
    }
    
    sound = new Audio.Sound();
    await sound.loadAsync({ uri: audioUri });
    await sound.playAsync();
    
    // Listen for playback completion
    sound.setOnPlaybackStatusUpdate(status => {
      if (status.isLoaded && status.didJustFinish) {
        if (onStatusChange) onStatusChange('Idle');
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error in conversation:', error);
    if (onStatusChange) onStatusChange('Error');
    return false;
  }
};

/**
 * Stop the current conversation
 */
export const stopConversation = async (): Promise<boolean> => {
  try {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      sound = null;
    }
    
    return true;
  } catch (error) {
    console.error('Error stopping conversation:', error);
    return false;
  }
};
