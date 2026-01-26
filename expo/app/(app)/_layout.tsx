import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Tabs } from 'expo-router'
import { FolderOpen, Home, ListTodo, ScanLine, Settings } from 'lucide-react-native'
import { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

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
        title: 'Receipts',
        tabBarIcon: ({ color, size }) => <ListTodo size={size} color={color} />,
      },
    },
    {
      name: 'receiptAnalizer',
      visible: true, 
      order: 4, 
      options: {
        title: 'Analyzer',
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
    </Tabs>
  )
}