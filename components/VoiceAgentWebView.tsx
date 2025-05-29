import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Audio } from 'expo-av';

interface VoiceAgentWebViewProps {
  agentId: string;
  apiKey: string;
  onStatusChange?: (status: string) => void;
  visible: boolean;
}

export const VoiceAgentWebView: React.FC<VoiceAgentWebViewProps> = ({ 
  agentId, 
  apiKey, 
  onStatusChange, 
  visible 
}) => {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  // Request microphone permissions using Expo's Audio API
  const requestMicrophonePermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
    }
  };

  // Request permissions when component mounts
  useEffect(() => {
    if (visible) {
      requestMicrophonePermission().then(granted => {
        if (granted) {
          console.log('Microphone permission granted');
          if (webViewRef.current) {
            sendMessageToWebView({ action: 'permissionGranted' });
          }
        } else {
          console.log('Microphone permission denied');
          setVoiceAgentStatus('Error: Microphone permission denied');
        }
      });
    }
  }, [visible]);

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
          padding: 20px;
          background-color: #f5f5f7;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          text-align: center;
        }
        .status {
          margin: 20px 0;
          padding: 10px;
          border-radius: 8px;
          background-color: #e1e1e6;
        }
        .controls {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 20px;
        }
        button {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          background-color: #4285F4;
          color: white;
          font-weight: bold;
          cursor: pointer;
        }
        button:disabled {
          background-color: #a9a9a9;
        }
        .active {
          background-color: #4CAF50;
        }
        .stop {
          background-color: #F44336;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>ElevenLabs Voice Agent</h2>
        <div class="status" id="statusDisplay">Status: Initializing...</div>
        <div class="controls">
          <button id="startButton">Start Conversation</button>
          <button id="stopButton" disabled>Stop Conversation</button>
        </div>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/@11labs/client@latest/dist/umd/index.js"></script>
      <script>
        // Initialize variables
        let conversation;
        let micPermissionGranted = false;
        const statusDisplay = document.getElementById('statusDisplay');
        const startButton = document.getElementById('startButton');
        const stopButton = document.getElementById('stopButton');
        
        // Function to update status and send to React Native
        function updateStatus(status) {
          statusDisplay.textContent = 'Status: ' + status;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'status', status }));
        }

        // Start conversation function
        async function startConversation() {
          try {
            updateStatus('Starting conversation...');
            
            // Skip the navigator.mediaDevices.getUserMedia call since we handle permissions in React Native
            
            // Start the conversation
            conversation = await ElevenLabs.Conversation.startSession({
              agentId: '${agentId}',
              apiKey: '${apiKey}',
              onConnect: () => {
                updateStatus('Connected');
                startButton.disabled = true;
                stopButton.disabled = false;
              },
              onDisconnect: () => {
                updateStatus('Disconnected');
                startButton.disabled = false;
                stopButton.disabled = true;
              },
              onError: (error) => {
                const errorMsg = typeof error === 'string' ? error : (error.message || 'Unknown error');
                updateStatus('Error: ' + errorMsg);
                console.error('Error:', error);
              },
              onModeChange: (modeInfo) => {
                const status = modeInfo.mode === 'speaking' ? 'Speaking' : 'Listening';
                updateStatus(status);
              },
            });
          } catch (error) {
            console.error('Failed to start conversation:', error);
            updateStatus('Error: ' + (error.message || 'Failed to start conversation'));
          }
        }

        // Stop conversation function
        async function stopConversation() {
          if (conversation) {
            try {
              await conversation.endSession();
              conversation = null;
              updateStatus('Conversation ended');
            } catch (error) {
              console.error('Error stopping conversation:', error);
              updateStatus('Error stopping: ' + (error.message || 'Unknown error'));
            }
          } else {
            updateStatus('No active conversation');
          }
        }

        // Add event listeners
        startButton.addEventListener('click', startConversation);
        stopButton.addEventListener('click', stopConversation);

        // Auto-start when visible
        ${visible ? 'window.onload = startConversation;' : ''}

        // Handle messages from React Native
        window.addEventListener('message', (event) => {
          const data = JSON.parse(event.data);
          if (data.action === 'start') {
            startConversation();
          } else if (data.action === 'stop') {
            stopConversation();
          } else if (data.action === 'permissionGranted') {
            micPermissionGranted = true;
            updateStatus('Microphone permission granted. Ready to start conversation.');
          }
        });
      </script>
    </body>
    </html>
  `;

  // Handle messages from the WebView
  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'status' && onStatusChange) {
        onStatusChange(data.status);
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

  // Set voice agent status for display
  const [voiceAgentStatus, setVoiceAgentStatus] = useState('Initializing...');

  // Start or stop conversation based on visibility
  useEffect(() => {
    if (webViewRef.current && visible) {
      // Don't auto-start - wait for permissions to be granted first
      // The start message will be sent after permissions are granted
    } else if (webViewRef.current && !visible) {
      sendMessageToWebView({ action: 'stop' });
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading Voice Agent...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={onMessage}
        onLoad={() => setLoading(false)}
        style={[styles.webView, loading ? styles.hidden : {}]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e1e1e6',
  },
  webView: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4285F4',
  },
});
