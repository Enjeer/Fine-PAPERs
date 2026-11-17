import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminProfile } from "@/lib/admin-api";

export default function AdminDashboardPage() {
  const profile = useOutletContext<AdminProfile>();
  const canViewDashboard = profile.sections.some(
    (section) => section.key === "dashboard",
  );

  if (!canViewDashboard) {
    return (
      <section className="mx-auto max-w-3xl space-y-2 py-12 text-center">
        <h1 className="font-display text-2xl font-bold">Административная панель</h1>
        <p className="text-muted-foreground">
          Разделы, доступные вашей роли, пока не подключены к панели.
        </p>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">FinePapers / Admin</p>
        <h1 className="font-display text-2xl font-bold">Обзор</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Данные пока не подключены</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            На этом этапе настроены административные роли и доступы. Источники
            аналитики ещё не подключены.
          </p>
          <p>Показатели не заменяются фиктивными нулями или демонстрационными данными.</p>
        </CardContent>
      </Card>
    </div>
  );
}
