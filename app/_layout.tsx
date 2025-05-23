import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { Slot } from 'expo-router';
import 'react-native-reanimated';


function RootLayoutNav() {
  return (
    <ClerkProvider>
      <Slot />
    </ClerkProvider>
  )
}

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache}>
      <Slot />
    </ClerkProvider>
  )
}
