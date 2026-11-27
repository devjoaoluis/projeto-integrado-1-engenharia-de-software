# Visitas e notificações

Cada visita pode ter lembrete configurado para 30 minutos, 1 dia, 2 dias ou 1 semana antes. O valor persistido é `reminder_lead_minutes`; `NULL` desativa o lembrete. `notification_sent` é a barreira idempotente: o serviço a reivindica atomicamente antes de exibir o alerta, e não volta a enviar essa visita.

Visitas `AGENDADA` não podem compartilhar o mesmo timestamp, independentemente do imóvel ou cliente. O caso de uso apresenta qual compromisso já ocupa o horário; os triggers SQLite também rejeitam gravações concorrentes diretas.

O inicializador da aplicação atualiza automaticamente bancos existentes. Para uma migração manual, execute uma única vez [0014_visit_reminder_and_exclusivity.sql](./src/main/infrastructure/database/migrations/0014_visit_reminder_and_exclusivity.sql) em um banco que já tenha a tabela `property_visits` da migração 0010. Não execute esse SQL manualmente em uma base que já recebeu as colunas pelo inicializador.

Todos os eventos passam pelo `NotificationService`, que persiste o item no histórico do sino antes de tentar a entrega nativa. Com uma janela em foco, o evento atualiza somente o sino; sem foco, tenta uma notificação do Windows. Falhas nativas não removem o histórico, e o app não tenta contornar o modo Foco/Não incomodar. A migração 0016 cria o armazenamento unificado e importa alertas de inadimplência antigos como lidos.
