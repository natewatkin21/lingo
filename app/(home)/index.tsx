import { SignedIn, SignedOut, useUser } from '@clerk/clerk-expo'
import { Link } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import * as voiceService from '../../services/voiceService'
import { SignOutButton } from '../../components/SignOutButton'
import { DailyGoalSetting } from '../../components/DailyGoalSetting'

export default function Page() {
  const { user } = useUser()

  return (
    <View style={styles.container}>
      <SignedIn>
        <View style={styles.contentContainer}>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Hello {user?.emailAddresses[0].emailAddress}</Text>
            <SignOutButton />
          </View>
          
          {/* Main content area would go here */}
          <View style={styles.mainContent}>
            <Text style={styles.placeholderText}>Main content area</Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => voiceService.testElevenLabsConnection()}
            >
              <Text style={styles.buttonText}>Test ElevenLabs Connection</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Daily goal setting moved to bottom */}
        <View style={styles.bottomContainer}>
          <DailyGoalSetting onGoalUpdated={(goal) => {
            console.log('Goal updated:', goal);
            // You can add additional logic here when the goal is updated
          }} />
        </View>
      </SignedIn>
      <SignedOut>
        <View style={styles.authContainer}>
          <Link href="/(auth)/sign-in" style={styles.authLink}>
            <Text style={styles.authLinkText}>Sign in</Text>
          </Link>
          <Link href="/(auth)/sign-up" style={styles.authLink}>
            <Text style={styles.authLinkText}>Sign up</Text>
          </Link>
        </View>
      </SignedOut>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 0,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  welcomeContainer: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
  },
  bottomContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
  },
  authContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  authLink: {
    marginVertical: 10,
    padding: 15,
    backgroundColor: '#4285F4',
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  authLinkText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    minWidth: 250,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});