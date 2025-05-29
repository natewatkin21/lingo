import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';

// Get the server URL dynamically
const getApiUrl = (): string => {
  // Check if running in development or production
  const isDev = __DEV__;
  let url: string;
  
  if (isDev) {
    // In development mode
    if (Platform.OS === 'ios') {
      // iOS simulator uses localhost
      url = 'http://localhost:3000';
    } else if (Platform.OS === 'android') {
      // Android emulator needs special IP
      url = 'http://10.0.2.2:3000';
    } else {
      // Web or other platforms
      url = 'http://localhost:3000';
    }
  } else {
    // In production, use your deployed server URL
    url = 'https://your-production-server.com';
  }
  
  console.log(`[VoiceAgentService] Using API URL: ${url}, Platform: ${Platform.OS}, isDev: ${isDev}`);
  return url;
};

const API_URL = getApiUrl();
const WS_URL = API_URL.replace('http://', 'ws://');

// Agent ID
const AGENT_ID = 'agent_01jvztxfrfejvv046e16ybrhnz';

// WebSocket connection
let ws: WebSocket | null = null;

// Recording and sound objects
let recording: Audio.Recording | null = null;
let sound: Audio.Sound | null = null;

// Connection status
let isConnected = false;

/**
 * Initialize the audio system
 */
const initAudio = async (): Promise<boolean> => {
  try {
    // Request microphone permission
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Microphone permission is required to use the voice agent');
      return false;
    }

    // Set audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: 1, // DO_NOT_MIX
      interruptionModeAndroid: 1, // DO_NOT_MIX
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    return true;
  } catch (error) {
    console.error('Error initializing audio:', error);
    return false;
  }
};

/**
 * Start recording audio
 */
const startRecording = async (): Promise<void> => {
  try {
    if (recording) {
      await stopRecording();
    }

    recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

    await recording.startAsync();
    console.log('Started recording');
  } catch (error) {
    console.error('Error starting recording:', error);
    recording = null;
  }
};

/**
 * Stop recording and send audio to server
 */
const stopRecording = async (): Promise<void> => {
  try {
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recording = null;

    if (!uri) {
      console.error('No recording URI available');
      return;
    }

    // Get audio data as base64
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Convert blob to base64
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = (reader.result as string).split(',')[1];
        
        // Send audio data to server if connected
        if (ws && isConnected) {
          console.log('Sending audio data to server...');
          ws.send(JSON.stringify({
            type: 'audio',
            audio: base64data,
            isFinal: true
          }));
        }
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error stopping recording:', error);
  }
};

/**
 * Play audio from base64 data
 */
const playAudio = async (base64Audio: string): Promise<void> => {
  try {
    // Create a temporary file URL from base64 data
    const audioUri = `data:audio/mp3;base64,${base64Audio}`;
    
    // Unload any existing sound
    if (sound) {
      await sound.unloadAsync();
    }
    
    // Load and play the new sound
    sound = new Audio.Sound();
    await sound.loadAsync({ uri: audioUri });
    await sound.playAsync();
  } catch (error) {
    console.error('Error playing audio:', error);
  }
};

/**
 * Connect to the voice agent
 */
export const connectToVoiceAgent = async (onStatusChange?: (status: string) => void): Promise<boolean> => {
  try {
    // Initialize audio
    const audioInitialized = await initAudio();
    if (!audioInitialized) {
      return false;
    }
    
    // Close existing connection if any
    if (ws) {
      ws.close();
      ws = null;
      isConnected = false;
    }
    
    // Update status
    if (onStatusChange) onStatusChange('Connecting');
    
    // Create new WebSocket connection
    ws = new WebSocket(WS_URL);
    
    if (ws) {
      // Handle connection open
      ws.onopen = () => {
        console.log('WebSocket connection established');
        
        // Initialize connection with agent ID
        if (ws) {
          ws.send(JSON.stringify({
            type: 'init',
            agentId: AGENT_ID
          }));
        }
      };
      
      // Handle messages from server
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle status updates
          if (data.type === 'status') {
            console.log('Status update:', data.status);
            
            if (data.status === 'connected') {
              isConnected = true;
              if (onStatusChange) onStatusChange('Connected');
              
              // Start recording when connected
              startRecording();
            } else if (data.status === 'disconnected' || data.status === 'stopped') {
              isConnected = false;
              if (onStatusChange) onStatusChange('Disconnected');
            }
          }
          // Handle audio data from agent
          else if (data.type === 'audio') {
            console.log('Received audio data');
            if (onStatusChange) onStatusChange('Speaking');
            
            // Play the audio
            playAudio(data.audio);
            
            // Start recording again after playing
            startRecording();
          }
          // Handle errors
          else if (data.type === 'error') {
            console.error('Error from server:', data.message);
            if (onStatusChange) onStatusChange('Error: ' + data.message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      // Handle errors
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onStatusChange) onStatusChange('Error: WebSocket connection failed');
      };
      
      // Handle connection close
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        isConnected = false;
        if (onStatusChange) onStatusChange('Disconnected');
      };
    }
    
    return true;
  } catch (error) {
    console.error('Error connecting to voice agent:', error);
    if (onStatusChange) onStatusChange('Error: Connection failed');
    return false;
  }
};

/**
 * Disconnect from the voice agent
 */
export const disconnectFromVoiceAgent = async (): Promise<boolean> => {
  try {
    // Stop recording if active
    if (recording) {
      await stopRecording();
    }
    
    // Stop playing if active
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      sound = null;
    }
    
    // Send stop message if connected
    if (ws && isConnected) {
      ws.send(JSON.stringify({
        type: 'stop'
      }));
    }
    
    // Close WebSocket connection
    if (ws) {
      ws.close();
      ws = null;
    }
    
    isConnected = false;
    return true;
  } catch (error) {
    console.error('Error disconnecting from voice agent:', error);
    return false;
  }
};

/**
 * Check if connected to the voice agent
 */
export const isVoiceAgentConnected = (): boolean => {
  return isConnected;
};
