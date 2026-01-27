import React, { useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { ArrowRight } from 'lucide-react-native'
import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'

import { getLocales } from 'expo-localization'

const { width } = Dimensions.get('window')

const SLIDES = [
  {
    id: '1',
    text: 'Welcome to our platform.\nManage your receipts with ease.',
  },
  {
    id: '2',
    text: 'Scan and organize.\nTrack expenses instantly.',
  },
  {
    id: '3',
    text: 'Get insights.\nAnalyze your spending habits over time.',
  },
]

const Dot = ({ index, scrollX, color }: { index: number, scrollX: SharedValue<number>, color: string }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const dotWidth = interpolate(
      scrollX.value,
      [
        (index - 1) * width,
        index * width,
        (index + 1) * width,
      ],
      [8, 20, 8],
      Extrapolation.CLAMP
    )
    
    const opacity = interpolate(
      scrollX.value,
      [
        (index - 1) * width,
        index * width,
        (index + 1) * width,
      ],
      [0.5, 1, 0.5],
      Extrapolation.CLAMP
    )

    return {
      width: dotWidth,
      opacity,
      backgroundColor: color
    }
  })

  return (
    <Animated.View
      style={[styles.dot, animatedStyle]}
    />
  )
}

const Pagination = ({ scrollX, colors }: { scrollX: SharedValue<number>, colors: any }) => {
  return (
    <View style={styles.pagination}>
      {SLIDES.map((_, index) => (
        <Dot key={index} index={index} scrollX={scrollX} color={colors.text} />
      ))}
    </View>
  )
}

export default function WelcomeScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const scrollX = useSharedValue(0)
  const flatListRef = useRef<FlatList>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  
  const currencyCode = getLocales()[0]?.currencyCode ?? 'USD'
  const displayPrice = '9.99' 

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push('/(auth)/login')
  }

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      })
    } else {
      router.push('/(auth)/login')
    }
  }

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.value = event.nativeEvent.contentOffset.x
    const index = Math.round(event.nativeEvent.contentOffset.x / width)
    if (index !== currentIndex) {
      setCurrentIndex(index)
      Haptics.selectionAsync()
    }
  }

  const renderItem = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => {
    const isLastSlide = index === SLIDES.length - 1

    return (
      <View style={[styles.slide, { width }]}>
        <View style={styles.textContainer}>
            <Text style={[styles.description, { color: colors.icon }]}>{item.text}</Text>
        </View>
        
        {isLastSlide ? (
          <View style={[styles.proContainer, { flex: 1, justifyContent: 'space-between' }]}>
            <View style={[styles.phonePlaceholder, { 
                width: 250, 
                height: 400,
                marginBottom: 10,
                backgroundColor: colors.card, 
                borderColor: colors.border 
            }]}>
              <Text style={[styles.phoneText, { color: colors.icon }]}>Phone Image</Text>
              <Text style={[styles.phoneSubText, { color: colors.icon }]}>(250x400)</Text>
            </View>

            <View style={{ width: '100%', alignItems: 'center' }}>
                <View style={styles.separatorContainer}>
                    <View style={[styles.line, { backgroundColor: colors.border }]} />
                    <Text style={[styles.separatorText, { color: colors.text }]}>become a pro</Text>
                    <View style={[styles.line, { backgroundColor: colors.border }]} />
                </View>

                <TouchableOpacity style={[styles.joinButton, { backgroundColor: colors.tint }]}>
                    <Text style={styles.joinButtonText}>
                        Join Pro - {currencyCode} {displayPrice} / month
                    </Text>
                </TouchableOpacity>

                <Text style={[styles.legalText, { color: colors.icon }]}>
                By continuing you agree to our <Text style={{ textDecorationLine: 'underline' }}>Terms of Service</Text> and <Text style={{ textDecorationLine: 'underline' }}>Privacy Policy</Text>.
            </Text>

                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                    <Text style={[styles.maybeLaterText, { color: colors.text }]}>maybe later</Text>
                </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.phonePlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.phoneText, { color: colors.icon }]}>Phone Image</Text>
            <Text style={[styles.phoneSubText, { color: colors.icon }]}>(250x500)</Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.companyName, { color: colors.text }]}>
          {process.env.EXPO_PUBLIC_COMPANY_NAME || 'Acme Corp'}
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
      />

      {currentIndex !== SLIDES.length - 1 && (
        <View style={styles.footer}>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.icon }]}>Skip</Text>
            </TouchableOpacity>

            <Pagination scrollX={scrollX} colors={colors} />

            <TouchableOpacity 
                onPress={handleNext} 
                style={[styles.nextButton, { backgroundColor: colors.card }]}
            >
                <ArrowRight size={24} color={colors.text} />
            </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: 40,
    paddingTop: 20, 
  },
  phonePlaceholder: {
    width: 250,
    height: 500,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  phoneText: {
    marginTop: 10,
  },
  phoneSubText: {
    fontSize: 10,
  },
  textContainer: {
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 24,
  },
  proContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    marginHorizontal: 10,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  joinButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  legalText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  maybeLaterText: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
    height: 80,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    fontSize: 16,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
