import React, { createContext, useState, ReactNode } from "react";
import { ApolloProvider, ApolloClient, InMemoryCache, HttpLink, ApolloLink, Observable } from '@apollo/client';
import { onError } from '@apollo/link-error';

// Sent with graphql request for auth headers
let authToken = '';

// initial state for State Context
const initial = {
  appState: { loggedIn: false },
  gqlError: { msg: '' },
  appSetLogin: (token: string) => { },
  appSetLogout: () => { },
  appSetAuthToken: (token: string) => { },
  appClearAuthToken: () => { },
}

/**
 * This context will be used for children pages like login etc
 */
export const AppStateContext = createContext(initial);


// AppState Provider
function AppStateProvider({ children }: { children: ReactNode }) {

   /**
   * These app state will be provided to the context and replaxe
   * the initial context
   */
  const [appState, setAppState] = useState({ loggedIn: false });
  const [gqlError, setGQLError] = useState({ msg: '' });

  // this will be called on login to set the auth header
  const appSetLogin = (token: string) => {
    authToken = token;
    setAppState({ ...appState, loggedIn: true });
  };

  // this will be called on logout
  const appSetLogout = () => {
    authToken = '';
    setAppState({ ...appState, loggedIn: false });
  };

  /**
   * // use to manage value of authtoken
   * witouth triggering Login or Logout
   */
  const appSetAuthToken = (token: string) => { authToken = token; };
  const appClearAuthToken = () => { authToken = ''; };
  const appGetAuthToken = (): string => { return authToken; };

  // apollo client
  const cache = new InMemoryCache({});

  /**
   * We first set the auth Header
   * then we call the handle
   * then we unsubscribe
   */
  const requestLink = new ApolloLink((operation, forward) =>
    new Observable(observer => {
      let handle: any;
      Promise.resolve(operation)
        .then((operation) => {
          operation.setContext({ headers: { authorization: `Bearer ${appGetAuthToken()}` } });
        })
        .then(() => {
          handle = forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });
        })
        .catch(observer.error.bind(observer));
      return () => {
        if (handle) handle.unsubscribe();
      };
    })
  );

  const client = new ApolloClient({
    link: ApolloLink.from([
      onError(({ graphQLErrors, networkError }) => {
        if (graphQLErrors === undefined || graphQLErrors[0].path === undefined) return;
        if (graphQLErrors[0].path[0] === 'refresh') return;
        const err = graphQLErrors[0].message;
        setGQLError({ msg: err });
      }),
      requestLink,
      new HttpLink({
        uri: 'http://localhost:4000/graphql',
        credentials: 'include'
      })
    ]),
    cache
  });

  return (
    <AppStateContext.Provider value={{
      appState,
      gqlError,
      appSetLogin,
      appSetLogout,
      appSetAuthToken,
      appClearAuthToken
      }}>
      <ApolloProvider client={client}>
        {children}
      </ApolloProvider>
    </AppStateContext.Provider>
  );
}

export default AppStateProvider;
