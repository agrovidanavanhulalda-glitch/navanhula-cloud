-- Função para validar os filtros de exportação
CREATE OR REPLACE FUNCTION public.validate_export_filters()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o filtro de status de sincronização estiver presente, ele não pode ser 'all', nulo ou vazio
  -- Estamos assumindo que se syncStatus existe nos filtros, ele deve ser válido
  IF (NEW.filters ? 'syncStatus') THEN
    IF (NEW.filters->>'syncStatus' IS NULL OR 
        NEW.filters->>'syncStatus' = '' OR 
        NEW.filters->>'syncStatus' = 'all') THEN
      RAISE EXCEPTION 'Status de sincronização inválido: deve ser Pendente, Sincronizando ou Sincronizado.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gatilho para aplicar a validação antes de inserir no histórico
CREATE TRIGGER trigger_validate_export_history
BEFORE INSERT ON public.export_history
FOR EACH ROW
EXECUTE FUNCTION public.validate_export_filters();