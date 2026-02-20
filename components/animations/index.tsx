import React, { useEffect } from "react";
import { View, ViewProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  FadeIn,
  SlideInUp,
  SlideInDown,
  SlideInLeft,
  SlideInRight,
  ZoomIn,
  BounceIn,
  Layout,
} from "react-native-reanimated";

interface AnimatedViewProps extends ViewProps {
  animation?:
    | "fade"
    | "slide-up"
    | "slide-down"
    | "slide-left"
    | "slide-right"
    | "zoom"
    | "bounce";
  delay?: number;
  duration?: number;
  springConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
}

const AnimatedView: React.FC<AnimatedViewProps> = ({
  children,
  animation = "fade",
  delay = 0,
  duration = 300,
  className,
  style,
  ...props
}) => {
  const getEnteringAnimation = () => {
    switch (animation) {
      case "fade":
        return FadeIn.duration(duration).delay(delay);
      case "slide-up":
        return SlideInUp.duration(duration).delay(delay).springify();
      case "slide-down":
        return SlideInDown.duration(duration).delay(delay).springify();
      case "slide-left":
        return SlideInLeft.duration(duration).delay(delay).springify();
      case "slide-right":
        return SlideInRight.duration(duration).delay(delay).springify();
      case "zoom":
        return ZoomIn.duration(duration).delay(delay).springify();
      case "bounce":
        return BounceIn.duration(duration).delay(delay).springify();
      default:
        return FadeIn.duration(duration).delay(delay);
    }
  };

  return (
    <Animated.View
      entering={getEnteringAnimation()}
      layout={Layout.springify()}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

interface StaggerContainerProps extends ViewProps {
  staggerDelay?: number;
  initialDelay?: number;
}

const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  staggerDelay = 100,
  initialDelay = 0,
  className,
  ...props
}) => {
  return (
    <View className={className} {...props}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        return (
          <AnimatedView
            animation="slide-up"
            delay={initialDelay + index * staggerDelay}
          >
            {child}
          </AnimatedView>
        );
      })}
    </View>
  );
};

interface AnimatedPressableProps {
  onPress?: () => void;
  children: React.ReactNode;
  scale?: number;
  className?: string;
  disabled?: boolean;
}

const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  onPress,
  children,
  scale = 0.95,
  className,
  disabled = false,
}) => {
  const scaleValue = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scaleValue.value = withTiming(scale, { duration: 100 });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scaleValue.value = withTiming(1, { duration: 100 });
    }
  };

  return (
    <Animated.View style={animatedStyle} className={className}>
      <Animated.View
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
        onTouchCancel={handlePressOut}
        onTouchEndCapture={onPress}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
};

interface ShakeAnimationProps {
  trigger: boolean;
  children: React.ReactNode;
  intensity?: number;
  duration?: number;
}

const ShakeAnimation: React.FC<ShakeAnimationProps> = ({
  trigger,
  children,
  intensity = 10,
  duration = 500,
}) => {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      translateX.value = withSequence(
        withTiming(-intensity, { duration: duration / 8 }),
        withTiming(intensity, { duration: duration / 4 }),
        withTiming(-intensity, { duration: duration / 4 }),
        withTiming(intensity, { duration: duration / 4 }),
        withTiming(0, { duration: duration / 8 }),
      );
    }
  }, [trigger, intensity, duration, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

interface SkeletonPulseProps {
  children: React.ReactNode;
  isLoading?: boolean;
}

const SkeletonPulse: React.FC<SkeletonPulseProps> = ({
  children,
  isLoading = true,
}) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isLoading) {
      opacity.value = withSequence(
        withTiming(0.5, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      );
    } else {
      opacity.value = 1;
    }
  }, [isLoading, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={isLoading ? animatedStyle : undefined}>
      {children}
    </Animated.View>
  );
};

export {
  AnimatedView,
  StaggerContainer,
  AnimatedPressable,
  ShakeAnimation,
  SkeletonPulse,
};

export type {
  AnimatedViewProps,
  StaggerContainerProps,
  AnimatedPressableProps,
  ShakeAnimationProps,
  SkeletonPulseProps,
};
