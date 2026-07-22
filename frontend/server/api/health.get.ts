import { API_VERSION, PRODUCT_ID, suiteMeta } from '../utils/suite'

export default defineEventHandler(() => ({
  status: 'ok',
  product: PRODUCT_ID,
  version: API_VERSION,
  ...suiteMeta({
    endpoints: [
      'GET /api/health',
      'GET /api/suite/meta',
      'GET /api/suite/overview',
      'GET /api/layers/all?layers=flood,power',
      'GET /api/geo/zip?zip=77002',
    ],
  }),
}))
