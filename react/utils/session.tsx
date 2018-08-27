import hoistNonReactStatics from 'hoist-non-react-statics'
import React, { ComponentType } from 'react'
import Session from '../components/Session'

const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const fetchWithRetry = (url: string, init: RequestInit, maxRetries: number = 3): Promise<void> => {
  const callFetch = (attempt: number = 0): Promise<void> =>
    fetch(url, init).then((response) => {
      return response.status >= 200 && response.status < 300
        ? {response, error: null}
        : response.json()
          .then((error) => ({response, error}))
          .catch(() => ({response, error: {message: 'Unable to parse JSON'}}))
    }).then(({response, error}: any) => {
      if (error) {
        console.error(error)

        if (attempt >= maxRetries) {
          throw new Error(error.message || `HTTP Error: status ${response.status}`)
        }

        const ms = (2 ** attempt) * 500
        return delay(ms)
          .then(() => callFetch(++attempt))
      }
    })

  return callFetch()
}

export const patchSession = (sessionToken: string) => {
  const path = sessionToken ? `/api/sessions/${sessionToken}` : `/api/sessions`
  const url =  `${path}${window.location.search}`

  return fetchWithRetry(url, {
    body: '{}',
    credentials: 'same-origin',
    headers: new Headers({'Content-Type': 'application/json'}),
    method: 'PATCH'
  })
}

export const createSession = () => {
  const url =  `/api/sessions${window.location.search}`

  return fetchWithRetry(url, {
    body: '{}',
    credentials: 'same-origin',
    headers: new Headers({'Content-Type': 'application/json'}),
    method: 'POST'
  })
}

export function withSession <TOriginalProps>(Component: ComponentType<TOriginalProps>): ComponentType<TOriginalProps> {
  class WithSession extends React.Component<TOriginalProps> {
    public static get displayName(): string {
      return `WithSession(${Component.displayName || Component.name || 'Component'})`
    }

    public static get WrappedComponent() {
      return Component
    }

    public render() {
      return (
        <Session>
          <Component {...this.props} />
        </Session>
      )
    }
  }

  return hoistNonReactStatics<TOriginalProps, {}>(WithSession, Component)
}
