import * as React from "react";
import { SearchX, Inbox, LayoutDashboard } from "lucide-react";
import { EmptyState, type EmptyStateProps } from "@/components/ui/empty-state";

export interface EmptySearchProps extends Omit<EmptyStateProps, "icon"> {
  query?: string;
}

export const EmptySearch: React.FC<EmptySearchProps> = ({
  title = "Sem resultados",
  description,
  query,
  ...rest
}) => (
  <EmptyState
    icon={SearchX}
    title={title}
    description={
      description ??
      (query
        ? `Nenhum resultado para "${query}". Tente outros termos ou remova os filtros.`
        : "Nenhum resultado encontrado. Ajuste os filtros e tente novamente.")
    }
    variant="glass"
    {...rest}
  />
);

export interface EmptyTableProps extends Omit<EmptyStateProps, "icon"> {}

export const EmptyTable: React.FC<EmptyTableProps> = ({
  title = "Sem registos",
  description = "Ainda não existem dados nesta tabela.",
  ...rest
}) => (
  <EmptyState
    icon={Inbox}
    title={title}
    description={description}
    variant="default"
    {...rest}
  />
);

export interface EmptyDashboardProps extends Omit<EmptyStateProps, "icon"> {}

export const EmptyDashboard: React.FC<EmptyDashboardProps> = ({
  title = "Dashboard sem dados",
  description = "Comece por registar operações para visualizar os seus indicadores premium.",
  ...rest
}) => (
  <EmptyState
    icon={LayoutDashboard}
    title={title}
    description={description}
    variant="premium"
    {...rest}
  />
);

export default EmptySearch;
