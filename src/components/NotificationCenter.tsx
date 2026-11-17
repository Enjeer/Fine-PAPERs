import { useCallback, useEffect, useState } from "react";
import { Bell, Check, CheckCheck, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/notifications-api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function notificationDestination(notification: AppNotification) {
  const route = notification.route;
  if (route.startsWith("/") && !route.startsWith("//")) return route;
  return notification.payload.ticket_id
    ? `/support?ticket=${encodeURIComponent(notification.payload.ticket_id)}`
    : "/support";
}

export default function NotificationCenter({
  collapsed,
}: {
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState(false);
  const [countError, setCountError] = useState(false);
  const [readError, setReadError] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const navigate = useNavigate();

  const refreshUnreadCount = useCallback(async () => {
    setCountError(false);
    try {
      setUnreadCount(await getUnreadNotificationCount());
    } catch {
      setCountError(true);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setListError(false);
    try {
      const page = await getNotifications();
      setNotifications(page.results);
    } catch {
      setListError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  function openPanel(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      void refreshUnreadCount();
      void loadNotifications();
    }
  }

  async function openNotification(notification: AppNotification) {
    setReadError(false);
    if (!notification.read_at) {
      try {
        await markNotificationRead(notification.id);
        await Promise.all([loadNotifications(), refreshUnreadCount()]);
      } catch {
        setReadError(true);
        return;
      }
    }
    setOpen(false);
    navigate(notificationDestination(notification));
  }

  async function markAllRead() {
    setIsMarkingAll(true);
    setReadError(false);
    try {
      await markAllNotificationsRead();
      await Promise.all([loadNotifications(), refreshUnreadCount()]);
    } catch {
      setReadError(true);
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={openPanel}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={`relative w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground ${
            collapsed ? "px-2" : "px-3"
          }`}
          aria-label={`Уведомления, непрочитанных: ${unreadCount}`}
        >
          <span className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] leading-4 text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
          {!collapsed && <span className="truncate">Уведомления</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="right"
        className="w-[min(24rem,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Уведомления</h2>
          <Button
            variant="ghost"
            size="sm"
            disabled={unreadCount === 0 || isMarkingAll}
            onClick={() => void markAllRead()}
          >
            <CheckCheck className="mr-1 h-4 w-4" />
            Прочитать все
          </Button>
        </div>
        {countError && (
          <p role="alert" className="px-4 py-2 text-sm text-destructive">
            Не удалось обновить счётчик непрочитанных уведомлений.
          </p>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Загрузка уведомлений…
          </div>
        ) : listError ? (
          <div className="space-y-3 p-4 text-sm">
            <p role="alert" className="text-destructive">
              Не удалось загрузить уведомления.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadNotifications()}
            >
              Повторить
            </Button>
          </div>
        ) : notifications.length ? (
          <ul className="max-h-[min(28rem,70vh)] divide-y overflow-y-auto">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                  onClick={() => openNotification(notification)}
                >
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      notification.read_at ? "bg-muted" : "bg-primary"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-medium">
                      {notification.title}
                    </span>
                    <span className="mt-1 block break-words text-xs text-muted-foreground">
                      {notification.message}
                    </span>
                    <span className="mt-2 block text-[11px] text-muted-foreground">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                  </span>
                  {!notification.read_at && (
                    <Check className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">
            У вас пока нет уведомлений.
          </p>
        )}
        {readError && (
          <p role="alert" className="border-t px-4 py-2 text-sm text-destructive">
            Не удалось отметить уведомление прочитанным.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
