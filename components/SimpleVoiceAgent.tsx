import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Audio } from 'expo-av';
import * as WebBrowser from 'expo-web-browser';

interface SimpleVoiceAgentProps {
  agentId: string;
  apiKey: string;
  visible: boolean;
  onStatusChange?: (status: string) => void;
}

export const SimpleVoiceAgent: React.FC<SimpleVoiceAgentProps> = ({
  agentId,
  apiKey,
  visible,
  onStatusChange
}) => {
  const [status, setStatus] = useState('Ready');
  const [isLoading, setIsLoading] = useState(false);

  // Update status and notify parent component
  const updateStatus = (newStatus: string) => {
    setStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  };

  // Request microphone permissions
  const requestMicrophonePermission = async () => {
    try {
      console.log('Requesting microphone permission...');
      const { status } = await Audio.requestPermissionsAsync();
      const isGranted = status === 'granted';
      console.log('Microphone permission:', isGranted ? 'granted' : 'denied');
      return isGranted;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
    }
  };

  // Activate the voice agent by opening the ElevenLabs agent URL
  const activateVoiceAgent = async () => {
    try {
      setIsLoading(true);
      updateStatus('Activating voice agent...');

      // Request microphone permission
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        updateStatus('Error: Microphone permission denied');
        setIsLoading(false);
        return;
      }

      // Construct the URL for the ElevenLabs agent
      // This follows the guide's recommendation for direct integration
      const url = `https://elevenlabs.io/agent/${agentId}?api_key=${apiKey}`;
      
      // Open the URL in the device's browser
      const result = await WebBrowser.openBrowserAsync(url);
      
      if (result.type === 'opened') {
        updateStatus('Voice agent activated in browser');
      } else {
        updateStatus('Failed to open browser');
      }
      
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error activating voice agent:', error);
      updateStatus('Error: ' + (error.message || 'Failed to activate voice agent'));
      setIsLoading(false);
    }
  };

  // Don't render anything if not visible
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ElevenLabs Voice Agent</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>Status: {status}</Text>
      </View>
      
      <TouchableOpacity
        style={styles.button}
        onPress={activateVoiceAgent}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Start Voice Agent in Browser</Text>
      </TouchableOpacity>
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      
      <Text style={styles.infoText}>
        This will open the ElevenLabs Voice Agent in your browser, where you can have a conversation with it directly.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f7',
    borderRadius: 8,
    padding: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e1e1e6',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  statusContainer: {
    backgroundColor: '#e1e1e6',
    padding: 10,
    borderRadius: 8,
    marginVertical: 15,
  },
  statusText: {
    textAlign: 'center',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 15,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 247, 0.7)',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4285F4',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});
