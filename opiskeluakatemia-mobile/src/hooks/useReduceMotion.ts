import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Follows the system "Reduce motion" setting. Returns `null` until the setting is known,
 * so callers can wait instead of starting an animation that should not run.
 */
export function useReduceMotion() {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduce(value); }).catch(() => { if (mounted) setReduce(true); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => setReduce(value));
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return reduce;
}
