import axios from 'axios'

const STORAGE_KEY = 'nexus_api_key'

/* ── Reactive Network Events ───────────────────────────────────────── */

type ApiEventCallback = () => void
const surgeListeners = new Set<ApiEventCallback>()
const rippleListeners = new Set<ApiEventCallback>()

/** Observable events for background reactivity */
export const apiEvents = {
    onSurge: (cb: ApiEventCallback) => surgeListeners.add(cb),
    onRipple: (cb: ApiEventCallback) => rippleListeners.add(cb),
    offSurge: (cb: ApiEventCallback) => surgeListeners.delete(cb),
    offRipple: (cb: ApiEventCallback) => rippleListeners.delete(cb),
    emitSurge: () => surgeListeners.forEach(cb => cb()),
    emitRipple: () => rippleListeners.forEach(cb => cb()),
}

/* ── Axios Instance ─────────────────────────────────────────────── */

const api = axios.create({
    baseURL: '/api',
})

// Track active requests to determine "Surge" state
let activeRequests = 0

api.interceptors.request.use(config => {
    activeRequests++
    if (activeRequests === 1) apiEvents.emitSurge()
    return config
})

api.interceptors.response.use(
    response => {
        activeRequests--
        if (activeRequests === 0) apiEvents.emitRipple()
        return response
    },
    error => {
        activeRequests--
        if (activeRequests === 0) apiEvents.emitRipple()
        return Promise.reject(error)
    }
)

/** Set the API key on the axios instance and persist to localStorage. */
export function setApiKey(key: string) {
    api.defaults.headers.common['X-API-KEY'] = key
    localStorage.setItem(STORAGE_KEY, key)
}

/** Remove the API key from axios and localStorage. */
export function clearApiKey() {
    delete api.defaults.headers.common['X-API-KEY']
    localStorage.removeItem(STORAGE_KEY)
}

/** Read a previously saved API key from localStorage (or null). */
export function getSavedApiKey(): string | null {
    return localStorage.getItem(STORAGE_KEY)
}

export default api
