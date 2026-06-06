/**
 * useApi — thin wrapper around the Axios instance for use in components.
 *
 * Returns the configured Axios instance. Use this hook when you need
 * direct API access inside a component. Prefer dedicated service functions
 * in /services/ for reusable API calls.
 *
 * Usage:
 *   import { useApi } from '@hooks/useApi'
 *   const api = useApi()
 *   const { data } = await api.get('/api/v1/employees')
 */
import api from '@services/api'

export function useApi() {
  return api
}
