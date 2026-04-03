
CREATE OR REPLACE FUNCTION public.notify_agro_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Notify company admins about the new agro order
  PERFORM notify_company_admins(
    NEW.company_id,
    'info',
    'Novo Pedido AGRO',
    'Novo pedido de ' || NEW.quantidade || ' unidades recebido de ' || NEW.cliente_nome || ' (Total: ' || NEW.total || ' MT)',
    'sales',
    '/app/agro-orders'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_agro_order
  AFTER INSERT ON public.agro_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_agro_order();
