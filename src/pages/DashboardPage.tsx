import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useProjects, getTypeLabel } from "@/lib/projects-context";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Project } from "@/lib/projects-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowRight,
  Cross,
  LoaderCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  active: { label: "Активный", variant: "outline" },
  inProgress: { label: "В работе", variant: "default" },
  done: { label: "Завершён", variant: "secondary" },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { projects, createProject, deleteProject } = useProjects();
  const navigate = useNavigate();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<Project["type"]>("course");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    inProgress: projects.filter((p) => p.status === "inProgress").length,
    done: projects.filter((p) => p.status === "done").length,
  };

  const recentProjects = [...projects]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);

  const normalizeDate = (lastUpdated) => {
    const convertedDate = new Date(lastUpdated);
    const normalizedDate = convertedDate.toLocaleString("ru-RU", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return normalizedDate;
  };

  const statCards = [
    {
      label: "Всего проектов",
      value: stats.total,
      icon: FileText,
      color: "text-primary",
    },
    {
      label: "Активных",
      value: stats.active,
      icon: AlertCircle,
      color: "text-warning",
    },
    {
      label: "В работе",
      value: stats.inProgress,
      icon: Clock,
      color: "text-accent",
    },
    {
      label: "Завершено",
      value: stats.done,
      icon: CheckCircle,
      color: "text-success",
    },
  ];

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setIsCreatingProject(true);

    try {
      const p = await createProject({
        name: newName,
        description: newDesc,
        type: newType,
        status: "active",
      });

      setCreateDialogOpen(false);
      setNewName("");
      setNewDesc("");

      setIsCreatingProject(false);
      navigate(`/projects/${p.id}`);
    } catch (err) {
      alert("Не удалось создать проект");
    }
  };

  return (
    <div className="p-2.5 lg:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex md:flex-row flex-col md:items-start justify-between">
        <div className="flex flex-col mobile:items-end gap-2">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Привет, {user?.user_name}
          </h1>
          <p className="text-muted-foreground mt-1">Вот обзор ваших проектов</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 mt-2">
              <Plus className="w-4 h-4" /> Новый проект
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Создать проект</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Название работы"
                />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Краткое описание"
                />
              </div>
              <div className="space-y-2">
                <Label>Тип работы</Label>
                <Select
                  value={newType}
                  onValueChange={(v) => setNewType(v as Project["type"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course">Курсовая</SelectItem>
                    <SelectItem value="essay">Эссе</SelectItem>
                    <SelectItem value="lab">Лабораторная</SelectItem>
                    <SelectItem value="diplom">Дипломная</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreate}
                disabled={isCreatingProject ? true : false}
                className="w-full"
              >
                {isCreatingProject && (
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                )}
                Создать
              </Button>
              <hr />
              <Button className="w-full" disabled>
                <Cross className="w-4 h-4 text-muted-foreground" />
                Ассистент
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* <Button onClick={() => navigate("/projects")} className="gap-2">
          <Plus className="w-4 h-4" /> Новый проект
        </Button> */}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-5 h-full flex flex-col justify-between gap-3">
              <div className="flex md:flex-col flex-row justify-between">
                <div className="flex items-center justify-between mb-3">
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
                <p className="text-2xl font-display font-bold text-foreground">
                  {s.value}
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-0 mb-0">
                {s.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-foreground">
            Недавние проекты
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/projects")}
            className="gap-1 text-muted-foreground"
          >
            Все проекты <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {recentProjects.map((p) => {
            const sc = STATUS_CONFIG[p.status];
            return (
              <Card
                key={p.id}
                className="cursor-pointer border-border hover:border-primary/30 transition-all group"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <CardContent className="p-5 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {p.name}
                    </h3>
                    <Badge
                      variant={sc.variant}
                      className="shrink-0 ml-2 text-xs"
                    >
                      {sc.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
                    {p.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                    <span>{getTypeLabel(p.type)}</span>
                    <span>Изменен: {normalizeDate(p.updatedAt)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Graphs */}
      <div></div>
    </div>
  );
}
