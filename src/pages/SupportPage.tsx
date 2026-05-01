import { useState } from "react";
import { useTickets, type Ticket } from "@/lib/tickets-context";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AccordionTrigger, AccordionItem, AccordionContent, Accordion} from "@radix-ui/react-accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Trash2, FolderOpen } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    active: { label: "Активна", variant: "default" },
    inProgress: { label: "В работе", variant: "destructive" },
    done: { label: "Обработана", variant: "secondary" },
    closed: { label: "Закрыта", variant: "outline" },
};

const FILTERS = ["Все", "Активные", "В работе", "Обработанные", "Закрытые"] as const;
const FILTER_MAP: Record<string, string | null> = {
    "Все": null, "Активные": "active", "В работе": "inProgress", "Обработанные": "done", "Закрытые" : "closed"
};

export default function SupportPage() {
    const { tickets, createTicket, closeTicket } = useTickets();
    const navigate = useNavigate();
    const [filter, setFilter] = useState<string>("Все");
    const [search, setSearch] = useState("");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [closeTicketDialogOpen, setCloseTicketDialogOpen] = useState<string | null>(null);
    const [newTheme, setNewTheme] = useState("");
    const [newDesc, setNewDesc] = useState("");

    const filtered = tickets.filter(p => {
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
        // if (!newName.trim()) return;
        
        // try {
        // const p = await createProject({ 
        //     name: newName, 
        //     description: newDesc, 
        //     type: newType, 
        //     status: "active" 
        // });
        
        // setCreateDialogOpen(false);
        // setNewName(""); 
        // setNewDesc("");
        
        // navigate(`/projects/${p.id}`);
        // } catch (err) {
        // alert("Не удалось создать проект");
        // }
    };

    const newTicket = () =>{
        window.open('https://forms.clickup.com/90121612778/f/2kxunbfa-612/MB7T1KYME3OPWKZ9IW');
    }
    
    return (
        <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-display font-bold text-foreground">Поддержка</h1>
            {/* <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild> */}
                <Button className="gap-2" onClick={newTicket}><Plus className="w-4 h-4"/> Оставить заявку</Button>
            {/* </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Новая заявка</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                <div className="space-y-2">
                    <Label>Тема</Label>
                    <Input value={newTheme} onChange={e => setNewTheme(e.target.value)} placeholder="Тема заявки" />
                </div>
                <div className="space-y-2">
                    <Label>Описание</Label>
                    <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Подробно опишите проблему" />
                </div>
                <Button onClick={handleCreate} className="w-full">Создать</Button>
                </div>
            </DialogContent>
            </Dialog> */}
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
            {/* <p className="text-lg font-medium">Заяки не найдены</p>
            <p className="text-sm">Отсавьте заяку или измените фильтры</p> */}
            <p className="text-lg font-medium">Раздел в разработке</p>
            <p className="text-sm text-center">Но вы можете <a className="hover:text-primary" target="_blank" href="https://forms.clickup.com/90121612778/f/2kxunbfa-612/MB7T1KYME3OPWKZ9IW">оставить заявку</a></p>
            <p className="text-sm text-center">Почта для контакта: <a className="hover:text-primary" href="mailto:aor.tech.2026@gmail.com">aor.tech.2026@gmail.com</a></p>
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
                        <span>Обновлен: {normalizeDate(p.updatedAt)}</span>
                    </div>
                    <Dialog open={closeTicketDialogOpen === p.id} onOpenChange={(open) => setCloseTicketDialogOpen(open ? p.id : null)}>
                        <DialogTrigger asChild>
                        <button
                            onClick={(e) => {e.stopPropagation(); setCloseTicketDialogOpen(p.id);}}
                            className="absolute top-auto bottom-1 right-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                            title="Удалить"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        </DialogTrigger>
                        <DialogContent onClick={(e) => e.stopPropagation()}>
                        <DialogHeader><DialogTitle className="font-display">Вы уверены, что хотите удалить проект?</DialogTitle></DialogHeader>
                        <div className="space-x-4 mt-2 justify-end">
                            <Button variant="destructive" onClick={()=>{ closeTicket(p.id); setCloseTicketDialogOpen(null) }} className="w-30">Удалить</Button>
                            <DialogTrigger asChild>
                            <Button onClick={() => {setCloseTicketDialogOpen(null)}} variant="outline" className="w-30">Отмена</Button>
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