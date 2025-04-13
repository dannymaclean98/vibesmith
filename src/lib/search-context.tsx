'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface SearchContextType {
  isExpanded: boolean;
  searchQuery: string;
  expand: () => void;
  collapse: () => void;
  setSearchQuery: (query: string) => void;
  clear: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const expand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const clear = useCallback(() => {
    setSearchQuery('');
    setIsExpanded(false);
  }, []);

  return (
    <SearchContext.Provider
      value={{
        isExpanded,
        searchQuery,
        expand,
        collapse,
        setSearchQuery,
        clear,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

