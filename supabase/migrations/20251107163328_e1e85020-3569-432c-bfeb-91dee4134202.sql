-- Update the delete policy to allow deletion of posted transactions (not just drafts)
-- Keep the reconciled check to prevent deletion of reconciled transactions
DROP POLICY IF EXISTS "Users can delete draft transactions" ON public.transactions;

CREATE POLICY "Users can delete unreconciled transactions"
  ON public.transactions
  FOR DELETE
  TO authenticated
  USING (reconciled = false AND deleted_at IS NULL);