// frontend/src/hooks/useRazorpay.js
import { useEffect, useState } from 'react';

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

const useRazorpay = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if script is already loaded
    if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay script');
      setIsLoaded(false);
    };

    document.body.appendChild(script);

    return () => {
      // Find and remove the script if it exists
      const scriptTag = document.querySelector(`script[src="${SCRIPT_URL}"]`);
      if (scriptTag) {
        document.body.removeChild(scriptTag);
      }
    };
  }, []);

  return isLoaded;
};

export default useRazorpay;