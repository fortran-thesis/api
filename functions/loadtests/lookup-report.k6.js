import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:5001/thesis-2e701/asia-southeast1/api';
const token = __ENV.AUTH_TOKEN || '';

export const options = {
  scenarios: {
    lookup_report: {
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
    http_req_duration: ['p(95)<900'],
  },
};

export default function () {
  const url = `${baseUrl}/v1/lookup`;
  const payload = JSON.stringify({
    symptoms: ['leaf spots', 'wilting'],
    signs: ['powdery growth'],
    characteristics: ['circular lesion'],
    moldNames: ['Fusarium'],
  });

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = http.post(url, payload, { headers });

  check(res, {
    'status is 2xx/4xx (no infra failure)': (r) => r.status >= 200 && r.status < 500,
  });
}
