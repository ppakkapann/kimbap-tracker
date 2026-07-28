import { AppChromeHeader } from "@/components/layout/AppChromeHeader";
import { isDemoMode } from "@/lib/config";
import { fetchAppNotifications } from "@/lib/queries";

export async function AppShellChrome() {
  const [notifications, demo] = await Promise.all([
    fetchAppNotifications(),
    Promise.resolve(isDemoMode()),
  ]);

  return <AppChromeHeader demo={demo} notifications={notifications} />;
}
