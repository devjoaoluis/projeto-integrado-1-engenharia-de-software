# HU-09: Lembretes de Visitas (RF09) — Backend

Implementação do backend da história de usuário **[HU-09] Lembretes de Visitas (RF09)**:
> *"Como corretor, eu quero que o sistema dispare lembretes automáticos das visitas agendadas, para que eu não perca um dia de visita."*

---

## 1. Arquitetura e Lógica de Alertas Temporais

A lógica de cálculo de alertas (`GetVisitAlerts`) avalia as visitas com status `AGENDADA` comparando a data/hora agendada (`scheduledAt`) com o horário de referência (`now`):

| Estágio (`stage`) | Condição Temporal | Nível de Urgência | Descrição / Exemplo |
| :--- | :--- | :--- | :--- |
| **`NOW`** | Entre -15 e +15 minutos do horário | `CRITICAL` | Visita ocorrendo no momento exato |
| **`IMMINENT_1H`** | Entre 16 e 60 minutos à frente | `HIGH` | Visita iminente na próxima hora (deslocamento) |
| **`TODAY`** | No mesmo dia civil (> 60 minutos à frente) | `MEDIUM` | Visita agendada para hoje |
| **`UPCOMING_24H`** | No dia seguinte (dentro de 24 horas) | `LOW` | Lembrete preventivo para o dia seguinte |
| **`OVERDUE`** | Horário expirou hoje (> 15 min de atraso) | `MEDIUM` | Visita de hoje pendente sem conclusão |

### Formato do Objeto de Alerta (`VisitAlert`)
```typescript
interface VisitAlert {
  id: string; // ex: "visit-123:IMMINENT_1H"
  visitId: string;
  stage: "UPCOMING_24H" | "TODAY" | "IMMINENT_1H" | "NOW" | "OVERDUE";
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  scheduledAt: number;
  diffMinutes: number; // minutos até a visita (positivo = futuro, negativo = atrasada)
  title: string;       // ex: "🔔 Visita em breve: Apartamento Jardins"
  message: string;     // ex: "Faltam 30 minutos para a visita com Carlos Eduardo..."
  property: {
    id: string;
    title: string;
    address: string;
  };
  client: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  notes: string | null;
  isDismissed: boolean;
  dismissedAt?: number | null;
}
```

---

## 2. Sistema de Notificações Visuais (`VisitReminderService`)

Para atender ao requisito de disparos automáticos e notificações visuais no sistema:
1. **Notificações Visuais Nativas do Sistema Operacional (OS Desktop Notifications)**:
   - Utiliza a API `Notification` do Electron (`new Notification({ title, body, urgency }).show()`).
   - Funciona mesmo se a janela estiver minimizada ou em segundo plano.
2. **Notificações Visuais In-App via IPC (Push em Tempo Real)**:
   - Emite o evento `visits:reminder-notification` via `webContents.send` para todas as janelas abertas (`BrowserWindow`).
   - Permite que o front-end renderize toasts, banners, badges ou popups visuais sem necessidade de polling manual.
3. **Scheduler em Background**:
   - Serviço em background iniciado no processo principal do Electron (`registerVisitsIpc`).
   - Executa checagem periódica a cada 60 segundos e checagens sob demanda ao criar ou remarcar visitas.
4. **Deduplicação e Persistência Confiável (RNF01)**:
   - Tabela SQLite `visit_reminders` (`id`, `visit_id`, `stage`, `triggered_at`, `dismissed_at`, `created_at`).
   - Evita disparos repetidos para a mesma visita no mesmo estágio.
   - Permite que novas notificações sejam emitidas quando a visita progredir para um estágio mais urgente (ex.: de `TODAY` para `IMMINENT_1H` e depois para `NOW`).
   - Relacionamento em cascata com `property_visits` (`ON DELETE CASCADE`).

---

## 3. Contrato de API no Preload (`window.api.visits`)

Para uso das equipes de front-end:

### 1. Obter alertas ativos de visitas
```javascript
// Retorna a lista ordenada de alertas ativos (por urgência e horário)
const alerts = await window.api.visits.getAlerts();

// Ou incluindo alertas já descartados pelo corretor
const allAlerts = await window.api.visits.getAlerts({ includeDismissed: true });
```

### 2. Ouvir notificações visuais disparadas em tempo real (Push)
```javascript
// Escuta novos lembretes disparados pelo backend
const unsubscribe = window.api.visits.onReminderNotification((alert) => {
  console.log("Novo lembrete recebido:", alert.title, alert.message);
  // Exibir toast / modal / badge na interface
});

// Para remover o listener ao desmontar o componente React:
// unsubscribe();
```

### 3. Forçar verificação imediata de lembretes
```javascript
const novosAlertasDisparados = await window.api.visits.checkReminders();
```

### 4. Descartar um lembrete (marcar como visto)
```javascript
await window.api.visits.dismissReminder({
  visitId: alert.visitId,
  stage: alert.stage,
});
```

---

## 4. Testes e Validação

- Testes de regras de alertas, estágios temporais e urgências:
  `src/main/application/use-cases/__tests__/VisitAlerts.test.ts` (11 testes).
- Testes de persistência SQLite, deduplicação e registro de IPC:
  `src/main/infrastructure/repositories/__tests__/VisitReminders.test.ts` (6 testes).
- Todos os testes do projeto passam (`npm test`).
- Typecheck (`npm run typecheck`) e lint (`npm run lint`) passam com 0 erros.
