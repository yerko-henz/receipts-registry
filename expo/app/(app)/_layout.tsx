import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Tabs, useRouter } from 'expo-router' // Added useRouter
import { FolderOpen, Home, ListTodo, ScanLine, Settings } from 'lucide-react-native'
import { ComponentProps, useEffect } from 'react' // Added useEffect
import { useTranslation } from 'react-i18next'
import { useGlobalStore } from '@/store/useGlobalStore' // Added useGlobalStore
import { ModalAlert } from '@/components/ui/modal-alert'

type TabConfig = {
  name: string
  visible: boolean
  order: number
  options: ComponentProps<typeof Tabs.Screen>['options']
}

export default function AppLayout() {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const { t } = useTranslation()

  // Configure which tabs are visible
  const router = useRouter()
  const { user } = useGlobalStore()

  useEffect(() => {
    // Check if user has completed onboarding
    // Immediate check without timeout to prevent flash
    if (user && !user.user_metadata?.onboarding_completed) {
        router.replace('/onboarding')
    }
  }, [user])
  
  if (user && !user.user_metadata?.onboarding_completed) {
      // Return null or a loader to prevent flashing the tabs while redirecting
      return null;
  }
  
  // Configure which tabs are visible
  // TODO: Replace these with actual permission checks (e.g., based on payment plan)
  const tabsConfig: TabConfig[] = [
    {
      name: 'index',
      visible: true, 
      order: 1,
      options: {
        title: t('app.home'),
        tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
      },
    },
    {
      name: 'receipts',
      visible: true, 
      order: 2,
      options: {
        title: t('app.receipts'),
        tabBarIcon: ({ color, size }) => <ListTodo size={size} color={color} />,
      },
    },
    {
      name: 'receiptAnalizer',
      visible: true, 
      order: 4, 
      options: {
        title: t('app.scanner'),
        tabBarIcon: ({ color, size }) => <ScanLine size={size} color={color} />,
      },
    },
    {
      name: 'settings',
      visible: true, // Always visible
      order: 5, 
      options: {
        title: t('app.settings'),
        tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
      },
    },
    {
      name: 'storage',
      visible: false, 
      order: 6,
      options: {
        title: t('app.storage'),
        tabBarIcon: ({ color, size }) => <FolderOpen size={size} color={color} />,
      },
    },
    {
      name: 'tasks',
      visible: false, 
      order: 7,
      options: {
        title: t('app.tasks'),
        tabBarIcon: ({ color, size }) => <ListTodo size={size} color={color} />,
      },
    },
  ]

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background, 
        },
      }}>
      {tabsConfig
        .sort((a, b) => a.order - b.order)
        .map(tab => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              ...tab.options,
              // Setting href to null hides the tab from the tab bar
              href: tab.visible ? undefined : null,
            }}
          />
      ))}
      <ModalAlert />
    </Tabs>
  )
}