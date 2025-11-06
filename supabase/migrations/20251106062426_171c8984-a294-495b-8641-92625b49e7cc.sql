-- Restrict delete to only draft transactions
DROP POLICY IF EXISTS "Anyone can delete transactions" ON public.transactions;

CREATE POLICY "Users can delete draft transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (status = 'draft');
