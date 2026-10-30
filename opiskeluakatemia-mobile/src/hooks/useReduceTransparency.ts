import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Follows the iOS "Reduce transparency" setting (always false on Android). Starts as `true`
 * so glass never flashes in before the setting is known; solid is the safe default.
 */
export function useReduceTransparency() {
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (mounted) setReduce(value); }).catch(() => { if (mounted) setReduce(true); });
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', value => setReduce(value));
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return reduce;
}
