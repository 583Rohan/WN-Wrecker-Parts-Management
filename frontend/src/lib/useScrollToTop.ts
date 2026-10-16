import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Start every new page at the top (links like /contact#request still jump to their section).
export function useScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
}
