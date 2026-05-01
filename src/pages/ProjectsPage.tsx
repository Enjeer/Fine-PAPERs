import { useState } from "react";
import { useProjects, getTypeLabel, type Project } from "@/lib/projects-context";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, FolderOpen, Cross, LoaderCircle} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "Активный", variant: "outline" },
  inProgress: { label: "В работе", variant: "default" },
  done: { label: "Завершён", variant: "secondary" },
};

const FILTERS = ["Все", "Активные", "В работе", "Завершённые"] as const;
const FILTER_MAP: Record<string, string | null> = {
  "Все": null, "Активные": "active", "В работе": "inProgress", "Завершённые": "done"
};

export default function ProjectsPage() {
  const { projects, createProject, deleteProject } = useProjects();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("Все");
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<Project["type"]>("course");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const filtered = projects.filter(p => {
    const statusMatch = !FILTER_MAP[filter] || p.status === FILTER_MAP[filter];
    const searchMatch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  const normalizeDate = (lastUpdated) => {
    const convertedDate = new Date(lastUpdated);
    const normalizedDate = convertedDate.toLocaleString('ru-RU', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    return normalizedDate;
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    
    setIsCreatingProject(true);

    try {
      const p = await createProject({ 
        name: newName, 
        description: newDesc, 
        type: newType, 
        status: "active" 
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
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground">Проекты</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Новый проект</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Создать проект</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название работы" />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Краткое описание" />
              </div>
              <div className="space-y-2">
                <Label>Тип работы</Label>
                <Select value={newType} onValueChange={v => setNewType(v as Project["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course">Курсовая</SelectItem>
                    <SelectItem value="essay">Эссе</SelectItem>
                    <SelectItem value="lab">Лабораторная</SelectItem>
                    <SelectItem value="diplom">Дипломная</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={isCreatingProject? true : false} className="w-full">
                {isCreatingProject && (
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                )}
                Создать
              </Button>
              <hr />
              <Button className="w-full" disabled><Cross className="w-4 h-4 text-muted-foreground"/>Ассистент</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-10" placeholder="Поиск проектов..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar -mx-1 px-1 touch-pan-x">
          {FILTERS.map(f => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="text-xs whitespace-nowrap px-4 h-9 shadow-sm"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-lg font-medium">Проекты не найдены</p>
          <p className="text-sm">Создайте первый проект или измените фильтры</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const sc = STATUS_CONFIG[p.status];
            return (
              <Card
                key={p.id}
                className="group cursor-pointer border-border hover:border-primary/30 transition-all relative"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <CardContent className="p-5 pb-7 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1 pr-2">
                      {p.name}
                    </h3>
                    <Badge variant={sc.variant} className="shrink-0 text-xs">{sc.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">{p.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                    <span>{getTypeLabel(p.type)}</span>
                    <span>Изменен: {normalizeDate(p.updatedAt)}</span>
                  </div>
                  <Dialog open={deleteDialogOpen === p.id} onOpenChange={(open) => setDeleteDialogOpen(open ? p.id : null)}>
                    <DialogTrigger asChild>
                      <button
                        onClick={(e) => {e.stopPropagation(); setDeleteDialogOpen(p.id);}}
                        className="absolute top-auto bottom-1 right-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </DialogTrigger>
                    <DialogContent onClick={(e) => e.stopPropagation()}>
                      <DialogHeader><DialogTitle className="font-display">Вы уверены, что хотите удалить проект?</DialogTitle></DialogHeader>
                      <div className="space-x-4 mt-2 justify-end">
                        <Button variant="destructive" onClick={()=>{ deleteProject(p.id); setDeleteDialogOpen(null) }} className="w-30">Удалить</Button>
                        <DialogTrigger asChild>
                          <Button onClick={() => {setDeleteDialogOpen(null)}} variant="outline" className="w-30">Отмена</Button>
                        </DialogTrigger>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
