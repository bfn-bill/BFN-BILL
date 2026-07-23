
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated, service_role;

DROP POLICY "Anyone can submit a payment request" ON public.payment_requests;
CREATE POLICY "Anyone can submit a payment request" ON public.payment_requests
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(user_id_input) > 0
  AND length(transaction_id) > 0
  AND length(sender_number) > 0
  AND amount > 0
  AND status = 'pending'
);
