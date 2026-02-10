import { setExtensionStatus, getExtensionStatus, getChatRedactions, getChatId } from '../messages';
import { EXTENSION_STATUS_ENABLED, EXTENSION_STATUS_DISABLED } from '../constants';

document.addEventListener('DOMContentLoaded', async () => {
  const extensionStatus = await getExtensionStatus();
  document.body.dataset.pgStatus = extensionStatus;

  const statusToggleElement = document.getElementById('statusToggle') as HTMLInputElement;
  statusToggleElement.checked = extensionStatus === EXTENSION_STATUS_ENABLED;

  statusToggleElement.addEventListener('change', async () => {
    setExtensionStatus(
      statusToggleElement.checked ? EXTENSION_STATUS_ENABLED : EXTENSION_STATUS_DISABLED
    );
  });

  const chatIdElement = document.getElementById('chatId')!;
  chatIdElement.textContent = await getChatId();

  const redactionCountElement = document.getElementById('redactionCount')!;
  redactionCountElement.textContent = String(Object.keys(await getChatRedactions()).length);
});
