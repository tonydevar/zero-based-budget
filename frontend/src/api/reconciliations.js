import { api } from './client.js';

export const reconciliationsApi = {
  createReconciliation: (accountId, statementBalance, transactionIds) =>
    api.post('/reconciliations', {
      account_id: accountId,
      statement_balance: statementBalance,
      transaction_ids: transactionIds,
    }),
};
