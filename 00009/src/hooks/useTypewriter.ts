import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTypewriterOptions {
  speed?: number;
  startDelay?: number;
  onComplete?: () => void;
}

export function useTypewriter(
  text: string,
  options: UseTypewriterOptions = {}
): {
  displayText: string;
  isComplete: boolean;
  isTyping: boolean;
  reset: () => void;
  skip: () => void;
} {
  const { speed = 30, startDelay = 0, onComplete } = options;

  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const indexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedRef = useRef(false);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimeouts();
    indexRef.current = 0;
    hasStartedRef.current = false;
    setDisplayText('');
    setIsTyping(false);
    setIsComplete(false);
  }, [clearTimeouts]);

  const skip = useCallback(() => {
    clearTimeouts();
    indexRef.current = text.length;
    setDisplayText(text);
    setIsTyping(false);
    setIsComplete(true);
    onComplete?.();
  }, [text, onComplete, clearTimeouts]);

  const type = useCallback(() => {
    if (indexRef.current >= text.length) {
      setIsTyping(false);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    setDisplayText(text.substring(0, indexRef.current + 1));
    indexRef.current++;

    timeoutRef.current = setTimeout(type, speed);
  }, [text, speed, onComplete]);

  useEffect(() => {
    reset();

    hasStartedRef.current = true;
    setIsTyping(true);

    if (startDelay > 0) {
      timeoutRef.current = setTimeout(type, startDelay);
    } else {
      type();
    }

    return clearTimeouts;
  }, [text, startDelay, type, reset, clearTimeouts]);

  return {
    displayText,
    isComplete,
    isTyping,
    reset,
    skip,
  };
}
