import { useEffect } from 'react';
import { useBusiness } from './business';

// Sets the browser tab title, e.g. "Shop | WN Wrecker". No title = the home page title.
export function usePageTitle(title?: string) {
  const { name } = useBusiness();
  useEffect(() => {
    document.title = title ? `${title} | ${name}` : `${name} — Quality recycled car parts`;
  }, [title, name]);
}
