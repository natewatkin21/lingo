import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { WebView } from 'react-native-webview';

interface VoiceAgentDirectProps {
  agentId: string;
  apiKey: string;
  visible: boolean;
  onStatusChange?: (status: string) => void;
}

export const VoiceAgentDirect: React.FC<VoiceAgentDirectProps> = ({
  agentId,
  apiKey,
  visible,
  onStatusChange
}) => {
  const [status, setStatus] = useState('Initializing...');
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const webViewRef = useRef<WebView>(null);

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

  // Handle messages from the WebView
  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'status') {
        updateStatus(data.status);
      }
      if (data.type === 'listeningChange') {
        setIsListening(data.isListening);
      }
      if (data.type === 'loadingChange') {
        setIsLoading(data.isLoading);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Send message to WebView
  const sendMessageToWebView = (message: any) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify(message));
    }
  };

  // Start the conversation
  const startConversation = async () => {
    // Request microphone permission first
    const permissionGranted = await requestMicrophonePermission();
    if (!permissionGranted) {
      updateStatus('Error: Microphone permission denied');
      return;
    }
    
    // Send start message to WebView
    sendMessageToWebView({ action: 'start' });
  };

  // Stop the conversation
  const stopConversation = () => {
    sendMessageToWebView({ action: 'stop' });
  };

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (isListening) {
        stopConversation();
      }
    };
  }, [isListening]);

  // Don't render anything if not visible
  if (!visible) {
    return null;
  }
  
  // HTML content with the ElevenLabs Conversational AI implementation
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ElevenLabs Voice Agent</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: transparent;
          color: #333;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
      </style>
    </head>
    <body>
      <div id="elevenlabs-container"></div>

      <script>
        // Initialize variables
        let conversation;
        let isListening = false;
        
        // Function to send messages to React Native
        function sendToReactNative(message) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }

        // Update status
        function updateStatus(status) {
          sendToReactNative({ type: 'status', status });
        }
        
        // Set loading state
        function setLoading(isLoading) {
          sendToReactNative({ type: 'loadingChange', isLoading });
        }
        
        // Set listening state
        function setListening(listening) {
          isListening = listening;
          sendToReactNative({ type: 'listeningChange', isListening: listening });
        }

        // Load the ElevenLabs client script dynamically
        function loadElevenLabsScript() {
          updateStatus('Loading ElevenLabs client...');
          
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@11labs/client@latest/dist/umd/index.js';
          script.async = true;
          
          script.onload = function() {
            updateStatus('ElevenLabs client loaded successfully');
            setLoading(false);
          };
          
          script.onerror = function() {
            updateStatus('Error: Failed to load ElevenLabs client');
            setLoading(false);
          };
          
          document.body.appendChild(script);
        }

        // Start conversation function
        async function startConversation() {
          try {
            updateStatus('Starting conversation...');
            setLoading(true);
            
            // Check if ElevenLabs is defined
            if (typeof window.ElevenLabs === 'undefined') {
              updateStatus('Error: ElevenLabs client not loaded');
              setLoading(false);
              return;
            }
            
            // Start the conversation
            conversation = await window.ElevenLabs.Conversation.startSession({
              agentId: '${agentId}',
              apiKey: '${apiKey}',
              onConnect: () => {
                updateStatus('Connected');
                setListening(true);
                setLoading(false);
              },
              onDisconnect: () => {
                updateStatus('Disconnected');
                setListening(false);
              },
              onError: (error) => {
                const errorMsg = typeof error === 'string' ? error : (error.message || 'Unknown error');
                updateStatus('Error: ' + errorMsg);
                console.error('Error:', error);
                setListening(false);
                setLoading(false);
              },
              onModeChange: (modeInfo) => {
                const status = modeInfo.mode === 'speaking' ? 'Speaking' : 'Listening';
                updateStatus(status);
              },
            });
          } catch (error) {
            console.error('Failed to start conversation:', error);
            updateStatus('Error: ' + (error.message || 'Failed to start conversation'));
            setLoading(false);
          }
        }

        // Stop conversation function
        async function stopConversation() {
          if (conversation) {
            try {
              await conversation.endSession();
              conversation = null;
              updateStatus('Conversation ended');
              setListening(false);
            } catch (error) {
              console.error('Error stopping conversation:', error);
              updateStatus('Error stopping: ' + (error.message || 'Unknown error'));
            }
          } else {
            updateStatus('No active conversation');
          }
        }

        // Handle messages from React Native
        window.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.action === 'start') {
              startConversation();
            } else if (data.action === 'stop') {
              stopConversation();
            }
          } catch (error) {
            console.error('Error handling message:', error);
          }
        });
        
        // Load the ElevenLabs client script
        loadElevenLabsScript();
        
        // Let React Native know we're initializing
        updateStatus('Initializing...');
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ElevenLabs Voice Agent</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Status: {status}</Text>
        </View>
      </View>
      
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          onMessage={onMessage}
          javaScriptEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          style={styles.webView}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isListening ? styles.disabledButton : styles.startButton]}
          onPress={startConversation}
          disabled={isListening || isLoading}
        >
          <Text style={styles.buttonText}>Start Conversation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, !isListening ? styles.disabledButton : styles.stopButton]}
          onPress={stopConversation}
          disabled={!isListening || isLoading}
        >
          <Text style={styles.buttonText}>Stop Conversation</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f7',
    borderRadius: 8,
    padding: 15,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e1e1e6',
    height: 400,
  },
  header: {
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  statusContainer: {
    backgroundColor: '#e1e1e6',
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
  },
  statusText: {
    textAlign: 'center',
    fontSize: 16,
  },
  webViewContainer: {
    height: 200,
    backgroundColor: 'transparent',
    marginVertical: 10,
  },
  webView: {
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4285F4',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  disabledButton: {
    backgroundColor: '#a9a9a9',
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4285F4',
  },
});
