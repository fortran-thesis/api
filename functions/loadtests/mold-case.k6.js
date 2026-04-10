import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:5001/thesis-2e701/asia-southeast1/api';
const token = __ENV.AUTH_TOKEN || '';
const caseId = __ENV.MOLD_CASE_ID || '';

export const options = {
  scenarios: {
    mold_case_read: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 40 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<700'],
  },
};

export default function () {
  const url = caseId
    ? `${baseUrl}/v1/mold-case/${caseId}`
    : `${baseUrl}/v1/mold-case?limit=20`;

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = http.get(url, { headers });

  check(res, {
    'status is 2xx/4xx (no infra failure)': (r) => r.status >= 200 && r.status < 500,
  });
}
