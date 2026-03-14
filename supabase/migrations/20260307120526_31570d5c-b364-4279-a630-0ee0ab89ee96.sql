CREATE TABLE public.api_usage (
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  extract_calls INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.api_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);