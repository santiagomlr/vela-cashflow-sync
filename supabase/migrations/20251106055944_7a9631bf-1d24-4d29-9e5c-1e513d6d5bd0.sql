-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create allowlist table for authorized emails
CREATE TABLE public.allowlist (
  email text PRIMARY KEY,
  added_at timestamptz DEFAULT now()
);

ALTER TABLE public.allowlist ENABLE ROW LEVEL SECURITY;

-- Insert allowed emails
INSERT INTO public.allowlist (email) VALUES 
  ('santiago@veladigital.mx'),
  ('joaquin@veladigital.mx');

-- Allowlist policies (only admins can view/manage)
CREATE POLICY "Only admins can view allowlist"
  ON public.allowlist FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Bank accounts table
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  institution text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all bank accounts"
  ON public.bank_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create bank accounts"
  ON public.bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update bank accounts"
  ON public.bank_accounts FOR UPDATE
  TO authenticated
  USING (true);

-- Transactions table
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  method text NOT NULL CHECK (method IN ('bank', 'cash')),
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  amount numeric(14,2) NOT NULL,
  concept text NOT NULL,
  category text,
  vat_rate numeric(5,4) DEFAULT 0,
  vat_included boolean DEFAULT true,
  vat_creditable boolean DEFAULT true,
  subtotal numeric(14,2),
  vat_amount numeric(14,2),
  total numeric(14,2),
  receipt_type text CHECK (receipt_type IN ('CFDI', 'INVOICE_PDF', 'TICKET')),
  receipt_url text,
  uuid_cfdi text,
  signature_url text,
  policy_pdf_url text,
  status text DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'pending')),
  reconciled boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Users can create transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update unreconciled transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (reconciled = false AND deleted_at IS NULL);

CREATE POLICY "Users can soft delete unreconciled transactions"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (reconciled = false AND status != 'draft');

-- Ledger entries table
CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  gl_account text NOT NULL,
  date date NOT NULL,
  debit numeric(14,2) DEFAULT 0,
  credit numeric(14,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all ledger entries"
  ON public.ledger_entries FOR SELECT
  TO authenticated
  USING (true);

-- Function to calculate VAT breakdown
CREATE OR REPLACE FUNCTION public.calculate_vat_breakdown(
  p_amount numeric,
  p_vat_rate numeric,
  p_vat_included boolean
)
RETURNS TABLE (
  subtotal numeric,
  vat_amount numeric,
  total numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_vat_included THEN
    -- VAT is included in the amount
    subtotal := ROUND(p_amount / (1 + p_vat_rate), 2);
    vat_amount := ROUND(p_amount - subtotal, 2);
    total := p_amount;
  ELSE
    -- VAT is not included
    subtotal := p_amount;
    vat_amount := ROUND(subtotal * p_vat_rate, 2);
    total := ROUND(subtotal + vat_amount, 2);
  END IF;
  
  RETURN NEXT;
END;
$$;

-- Function to create ledger entries for transactions
CREATE OR REPLACE FUNCTION public.create_ledger_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank_account_name text;
BEGIN
  -- Delete existing ledger entries for this transaction
  DELETE FROM public.ledger_entries WHERE transaction_id = NEW.id;
  
  -- Get bank account name if applicable
  IF NEW.bank_account_id IS NOT NULL THEN
    SELECT name INTO v_bank_account_name FROM public.bank_accounts WHERE id = NEW.bank_account_id;
  END IF;
  
  -- Create entries based on transaction type
  IF NEW.type = 'income' THEN
    -- DR: Bank/Cash = total
    INSERT INTO public.ledger_entries (transaction_id, gl_account, date, debit, credit)
    VALUES (
      NEW.id,
      CASE WHEN NEW.method = 'bank' THEN 'Banco - ' || COALESCE(v_bank_account_name, 'N/A') ELSE 'Caja' END,
      NEW.date,
      NEW.total,
      0
    );
    
    -- CR: Income = subtotal
    INSERT INTO public.ledger_entries (transaction_id, gl_account, date, debit, credit)
    VALUES (
      NEW.id,
      'Ingresos - ' || COALESCE(NEW.category, 'Sin categoría'),
      NEW.date,
      0,
      NEW.subtotal
    );
    
    -- CR: VAT Collected = vat_amount (if any)
    IF NEW.vat_amount > 0 THEN
      INSERT INTO public.ledger_entries (transaction_id, gl_account, date, debit, credit)
      VALUES (
        NEW.id,
        'IVA Trasladado',
        NEW.date,
        0,
        NEW.vat_amount
      );
    END IF;
    
  ELSIF NEW.type = 'expense' THEN
    IF NEW.vat_creditable AND NEW.vat_amount > 0 THEN
      -- Creditable VAT
      -- DR: Expense = subtotal
      INSERT INTO public.ledger_entries (transaction_id, gl_account, date, debit, credit)
      VALUES (
        NEW.id,
        'Gastos - ' || COALESCE(NEW.category, 'Sin categoría'),
        NEW.date,
        NEW.subtotal,
        0
      );
      
      -- DR: VAT Creditable = vat_amount
      INSERT INTO public.ledger_entries (transaction_id, gl_account, date, debit, credit)
      VALUES (
        NEW.id,
        'IVA Acreditable',
        NEW.date,
        NEW.vat_amount,
        0
      );
    ELSE
      -- Non-creditable VAT
      -- DR: Expense = subtotal + vat_amount
      INSERT INTO public.ledger_entries (transaction_id, gl_account, date, debit, credit)
      VALUES (
        NEW.id,
        'Gastos - ' || COALESCE(NEW.category, 'Sin categoría'),
        NEW.date,
        NEW.subtotal + COALESCE(NEW.vat_amount, 0),
        0
      );
    END IF;
    
    -- CR: Bank/Cash = total
    INSERT INTO public.ledger_entries (transaction_id, gl_account, date, debit, credit)
    VALUES (
      NEW.id,
      CASE WHEN NEW.method = 'bank' THEN 'Banco - ' || COALESCE(v_bank_account_name, 'N/A') ELSE 'Caja' END,
      NEW.date,
      0,
      NEW.total
    );
    
  ELSIF NEW.type = 'transfer' THEN
    -- For transfers, we'll need special handling
    -- This would typically involve two bank accounts
    NULL; -- Placeholder for transfer logic
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically create ledger entries
CREATE TRIGGER trg_create_ledger_entries
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  WHEN (NEW.status = 'posted')
  EXECUTE FUNCTION public.create_ledger_entries();

-- Function to automatically calculate VAT on insert/update
CREATE OR REPLACE FUNCTION public.auto_calculate_vat()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_calc RECORD;
BEGIN
  -- Calculate VAT breakdown
  SELECT * INTO v_calc
  FROM public.calculate_vat_breakdown(NEW.amount, NEW.vat_rate, NEW.vat_included);
  
  NEW.subtotal := v_calc.subtotal;
  NEW.vat_amount := v_calc.vat_amount;
  NEW.total := v_calc.total;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-calculate VAT before insert/update
CREATE TRIGGER trg_auto_calculate_vat
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_calculate_vat();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER trg_update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if email is in allowlist
  IF NOT EXISTS (SELECT 1 FROM public.allowlist WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'Email no está en la lista de usuarios autorizados';
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'editor');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for receipts and signatures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  5242880, -- 5MB
  ARRAY['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png', 'image/jpg']
);

-- Storage policies for receipts
CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can view receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can update receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can delete receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'receipts');