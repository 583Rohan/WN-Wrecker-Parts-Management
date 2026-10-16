// Small line icons used on the home page and in the footer (they take the text colour).
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const SearchIcon = () => <svg {...base}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
export const CarIcon = () => <svg {...base}><path d="M4 16v-3.5l1.8-4.6A2 2 0 0 1 7.7 6.6h8.6a2 2 0 0 1 1.9 1.3l1.8 4.6V16" /><path d="M3 16h18v2.5H3z" /><circle cx="7.5" cy="16" r="1.6" /><circle cx="16.5" cy="16" r="1.6" /><path d="M5.5 12h13" /></svg>;
export const ChatIcon = () => <svg {...base}><path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16h-8l-4.5 3.5V16H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 5z" /></svg>;
export const CheckIcon = () => <svg {...base}><path d="M12 3.5 5 6.5v5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9v-5z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>;
export const RecycleIcon = () => <svg {...base}><path d="M7.5 9.5 10 5.2a2.3 2.3 0 0 1 4 0l1.4 2.4" /><path d="m14 7.8 1.6.2.5-1.7" /><path d="M18.4 12.5l2.1 3.6a2.3 2.3 0 0 1-2 3.4h-3" /><path d="m16.8 18.2-1.3 1.3 1.3 1.2" /><path d="M9 19.5H5.5a2.3 2.3 0 0 1-2-3.4l1.6-2.8" /><path d="m5 11.5-.5 1.7 1.7.6" /></svg>;
