import { describe, expect, it } from 'vitest';
import {
  buildSummary,
  parseOpenApiRpcFunctions,
  parseRequiredTables,
} from '../../scripts/verify-db-schema.js';

describe('verify-db-schema script helpers', () => {
  it('extracts table names from the schema ER diagram definitions', () => {
    const schema = `
erDiagram
    profiles {
        uuid id PK
    }

    orders {
        uuid id PK
    }

    profiles ||--o{ orders : "customer_id"
`;

    expect(parseRequiredTables(schema)).toEqual(['profiles', 'orders']);
  });

  it('extracts RPC names from PostgREST OpenAPI paths', () => {
    const functions = parseOpenApiRpcFunctions({
      paths: {
        '/profiles': {},
        '/rpc/accept_bid_tx': {},
        '/rpc/withdraw_funds_tx': {},
      },
    });

    expect(functions).toEqual(new Set(['accept_bid_tx', 'withdraw_funds_tx']));
  });

  it('summarizes missing tables and functions', () => {
    const summary = buildSummary(
      [
        { name: 'profiles', ok: true },
        { name: 'orders', ok: false },
      ],
      [
        { name: 'accept_bid_tx', ok: true },
        { name: 'submit_rating_tx', ok: false },
      ]
    );

    expect(summary).toEqual({
      tablesChecked: 2,
      missingTables: 1,
      functionsChecked: 2,
      missingFunctions: 1,
    });
  });
});
