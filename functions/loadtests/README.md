# k6 Load Tests

These scripts validate high-priority API modules under concurrent load:

- Model prediction flow: `loadtests/model-predict.k6.js`
- Lookup/report flow: `loadtests/lookup-report.k6.js`
- Mold-case retrieval flow: `loadtests/mold-case.k6.js`

## Prerequisites

1. Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
2. Set target host and auth token as environment variables:

```bash
export BASE_URL="http://localhost:5001/thesis-2e701/asia-southeast1/api"
export AUTH_TOKEN="<firebase-id-token-or-session-bearer>"
```

## Run

```bash
npm run loadtest:model
npm run loadtest:lookup
npm run loadtest:mold-case
```

## Threshold targets

- HTTP failure rate: < 1%
- p95 duration:
  - model predict: < 1500 ms
  - lookup/report: < 900 ms
  - mold-case retrieval: < 700 ms

Tune thresholds per environment once baseline metrics are established.
