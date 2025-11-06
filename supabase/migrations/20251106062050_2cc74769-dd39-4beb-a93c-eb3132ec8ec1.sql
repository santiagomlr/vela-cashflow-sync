-- Relax delete policy so any signed-in user can delete any transaction (including drafts)
DROP POLICY IF EXISTS "Users can soft delete unreconciled transactions" ON public.transactions;

CREATE POLICY "Anyone can delete transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (true);
