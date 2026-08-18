// Repository access for views. The concrete implementation is chosen once in
// App.tsx; everything below it reads the repository from context so no view
// needs to know whether it is talking to Firestore or running in Test Access.
import React, { createContext, useContext } from 'react';
import type { ICricketRepository } from './CricketRepository';

const RepositoryContext = createContext<ICricketRepository | null>(null);

export const RepositoryProvider: React.FC<{
  repository: ICricketRepository;
  children: React.ReactNode;
}> = ({ repository, children }) => (
  <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>
);

export function useRepository(): ICricketRepository {
  const repository = useContext(RepositoryContext);
  if (!repository) {
    throw new Error('useRepository must be used inside a <RepositoryProvider>.');
  }
  return repository;
}
