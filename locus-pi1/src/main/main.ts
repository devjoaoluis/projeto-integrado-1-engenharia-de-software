import { registerContractTemplatesIpc } from "./ipc/contracts/contract-templates.ipc";
import { registerContractsIpc } from "./ipc/contracts/contracts.ipc";
import { registerInspectionEntryIpc } from "./ipc/inspections/inspection-entry.ipc";
import { registerInspectionExitIpc } from "./ipc/inspections/inspection-exit.ipc";
import { registerInspectionsIpc } from "./ipc/inspections/inspections.ipc";
import { registerTenantDocumentsIpc } from "./ipc/tenants/tenant-documents.ipc";
import { registerVisitsIpc } from "./ipc/visits/visits.ipc";
import { registerOverdueIpc } from "./ipc/finance/overdue.ipc";
import { registerNotificationsIpc } from "./ipc/notifications/notifications.ipc";
import { registerLateFeeIpc } from "./ipc/finance/late-fee.ipc";
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerPropertiesIpc } from './ipc/properties/properties.ipc';
import { registerPropertyMediaIpc } from './ipc/properties/property-media.ipc';
import { registerAuthIpc } from './ipc/auth/auth.ipc';
import { registerContactsIpc } from './ipc/contacts/contacts.ipc';
import { registerClientsIpc } from './ipc/contacts/clients.ipc';
import { registerPropertyOverviewIpc } from './ipc/properties/property-overview.ipc';
import { registerRentalsIpc } from './ipc/rentals/rentals.ipc';
import { databaseReady } from './infrastructure/database/db';
import { SeedBuiltinContractTemplates } from './application/use-cases/SeedBuiltinContractTemplates';
import { DrizzleContractTemplateRepository } from './infrastructure/repositories/DrizzleContractTemplateRepository';
import { NotificationService } from "./application/services/NotificationService";
import { ElectronNativeNotificationPublisher } from "./application/services/ElectronNativeNotificationPublisher";
import { DrizzleNotificationRepository } from "./infrastructure/repositories/DrizzleNotificationRepository";
import { OverdueAlertMonitor } from "./application/services/OverdueAlertMonitor";
import { VisitReminderService } from "./application/services/VisitReminderService";
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

if (process.platform === "win32") {
  app.setAppUserModelId("com.locus.pi1");
}

if (process.env.DOCKER_CONTAINER === 'true' || process.env.NO_SANDBOX === 'true') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
}

const createWindow = (initialRoute?: string) => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
    },
  });
  mainWindow.once("focus", () => {
    activeReminderService?.start(60000);
    overdueAlertMonitor?.start(60000);
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}${initialRoute ? `#${initialRoute}` : ""}`);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      initialRoute ? { hash: initialRoute } : undefined,
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  return mainWindow;
};

let activeReminderService: VisitReminderService | null = null;
let overdueAlertMonitor: OverdueAlertMonitor | null = null;


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  await databaseReady;
  await new SeedBuiltinContractTemplates(new DrizzleContractTemplateRepository()).execute();

  const notificationService = new NotificationService(
    new DrizzleNotificationRepository(),
    new ElectronNativeNotificationPublisher(),
    {
      isAppFocused: () => BrowserWindow.getAllWindows().some(
        (window) => !window.isDestroyed() && window.isFocused()
      ),
      broadcastChanged: () => {
        for (const window of BrowserWindow.getAllWindows()) {
          if (!window.isDestroyed()) window.webContents.send("notifications:changed");
        }
      },
      broadcastNativeUnavailable: () => {
        for (const window of BrowserWindow.getAllWindows()) {
          if (!window.isDestroyed()) window.webContents.send("notifications:native-unavailable");
        }
      },
      navigateTo: async (target) => {
        const window = BrowserWindow.getAllWindows().find((item) => !item.isDestroyed())
          ?? createWindow(target);
        if (window.isMinimized()) window.restore();
        window.show();
        window.focus();

        const navigate = () => {
          window.webContents.executeJavaScript(
            `window.location.hash = ${JSON.stringify(target)}`
          ).catch((error) => {
            console.error("Não foi possível navegar até a notificação:", error);
          });
        };
        if (window.webContents.isLoading()) {
          window.webContents.once("did-finish-load", navigate);
        } else {
          navigate();
        }
      },
    }
  );
  
  registerPropertiesIpc();
  registerPropertyMediaIpc();
  registerAuthIpc();
  registerClientsIpc();
  registerContactsIpc();
  registerRentalsIpc();
  registerPropertyOverviewIpc();
  registerContractTemplatesIpc();
  registerContractsIpc();
  registerInspectionsIpc();
  registerInspectionEntryIpc();
  registerInspectionExitIpc();
  registerTenantDocumentsIpc();
  registerNotificationsIpc(notificationService);
  activeReminderService = registerVisitsIpc(notificationService);
  const triggerOverdueAlerts = registerOverdueIpc(notificationService);
  overdueAlertMonitor = new OverdueAlertMonitor(triggerOverdueAlerts);
  registerLateFeeIpc();
  createWindow();
});

app.on("will-quit", () => {
  activeReminderService?.stop();
  overdueAlertMonitor?.stop();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
