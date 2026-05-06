import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjects, type Block } from "@/lib/projects-context";
import ImageBlockEditor from "@/lib/ImageBlockEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import {
  ArrowLeft, Plus, Trash2, GripVertical, Type, Heading, Image, Table, FileText, Save,
  ChevronUp, ChevronDown, Lock,
  LoaderCircle, Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from "@/components/ui/resizable";
import DocumentPreview from "@/components/DocumentPreview";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/lib/axios";
import { isMobile } from 'react-device-detect';

const BLOCK_TYPES = [
  { type: "heading", label: "Заголовок", icon: Heading },
  { type: "text", label: "Текст", icon: Type },
  { type: "image", label: "Изображение", icon: Image },
  { type: "table", label: "Таблица", icon: Table },
] as const;

type EnrichedBlock = Block & {
  chapterColor: string | null;
  isChapterRoot: boolean;
};

function createBlock(type: Block["type"]): Block {
  const id = crypto.randomUUID();
  switch (type) {
    case "heading": return { id, type, content: { text: "Новый заголовок", level: 1} };
    case "text": return { id, type, content: { text: "" } };
    case "title-page": return { id, type, content: { university: "", department: "", subject: "", title: "", studentName: "", faculty: "", group: "", teacherName: "", jobTitle: "", city: "Минск", year: new Date().getFullYear().toString() } };
    case "image": return { id, type, content: { url: "", caption: "" } };
    case "table": return { id, type, content: { rows: 3, cols: 3, data: Array(9).fill("") } };
    default: return { id, type: "text", content: { text: "" } };
  }
}

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject, updateProject, updateBlocks, downloadProject } = useProjects();
  const navigate = useNavigate();
  const project = getProject(projectId || "");
  const [isInitialized, setIsInitialized] = useState(false);

  const [blocks, setBlocks] = useState<Block[]>(() => {
    const existing = Array.isArray(project?.blocks) 
      ? project.blocks.filter(Boolean) 
      : [];

    const hasTitlePage = existing.some(b => b && b.type === "title-page");

    if (!hasTitlePage) {
      return [createBlock("title-page"), ...existing];
    }
    return existing;
  });

  useEffect(() => {
    if (project && !isInitialized) {
      const initialBlocks = project.blocks?.length > 0 
        ? project.blocks 
        : [createBlock("title-page")];
        
      setBlocks(initialBlocks);
      setProjectName(project.name);
      setIsInitialized(true);
    }
  }, [project, isInitialized]);

  const [projectName, setProjectName] = useState(project?.name || "");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const menuContainerRef = useRef(null);

  useEffect(() => {
    if (addMenuOpen && menuContainerRef.current) {
      menuContainerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'start'
      });
    }
  }, [addMenuOpen]);

  const saveBlocks = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks);
    setIsDirty(true);
    setIsSaved(false);
  }, [projectId, updateBlocks]);

  const addBlock = (type: Block["type"]) => {
    saveBlocks([...blocks, createBlock(type)]);
    setAddMenuOpen(false);
  };

  const removeBlock = (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (block?.type === "title-page") return;
    saveBlocks(blocks.filter(b => b.id !== id));
  };

  const updateBlock = (id: string, content: Record<string, any>) => {
    saveBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const moveBlock = (blockId: string, dir: -1 | 1) => {
    const currentIndex = blocks.findIndex(b => b.id === blockId);
    const newIdx = currentIndex + dir;

    if (currentIndex === -1 || blocks[currentIndex].type === "title-page") return;
    if (newIdx < 1 || newIdx >= blocks.length) return;

    const newBlocks = [...blocks];
    [newBlocks[currentIndex], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[currentIndex]];
    saveBlocks(newBlocks);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);

    if (blocks[oldIndex].type === "title-page") return;
    if (newIndex === 0) return;

    saveBlocks(arrayMove(blocks, oldIndex, newIndex));
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
    const updatedBlocks = await Promise.all(blocks.map(async (block) => {
      const isLocalBlob = block.type === 'image' && block.content.url?.startsWith('blob:');
      if (block.type === 'image' && isLocalBlob && block.content.file) {
        try {
          const formData = new FormData();
          formData.append('file', block.content.file);
          const res = await api.post('upload_image/', formData);
          return {
            ...block,
            content: { ...block.content, url: res.data.url, file: undefined }
          };
        } catch (e) {
          return block;
        }
      }
      return block;
    }));

    if (projectId) {
      await updateProject(projectId, { name: projectName });
      await updateBlocks(projectId, updatedBlocks);
    }

    toast({ title: "Сохранено", description: "Проект успешно сохранён" });
    } catch (error) {
      console.error('Общая ошибка сохранения проекта:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось сохранить проект", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
      setIsSaved(true);
    }
  };

  useEffect(() => {
    if (!isDirty || isSaving) return;

    const timer = setTimeout(async () => {
      const hasPendingImages = blocks.some(
        b => b.type === 'image' && b.content.url?.startsWith('blob:')
      );

      if (hasPendingImages) return;

      try {
        await updateBlocks(projectId!, blocks);
        setIsDirty(false);
        toast({ title: "Автосохранение выполнено" });
        console.log(isMobile);
      } catch (e) {
        console.error("Auto-save failed", e);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [blocks, isDirty, projectId, isSaving]);

const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    console.log(isDownloading);

    try {
      await downloadProject(project.id, project.name);
      toast({ title: "Выгрузка", description: "Проект успешно выгружен" });
    } catch (error) {
      console.error('Общая ошибка загрузки проекта:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось выгрузить проект", 
        variant: "destructive" 
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>Проект не найден</p>
        <Button variant="ghost" onClick={() => navigate("/projects")} className="mt-4">К проектам</Button>
      </div>
    );
  }

  const titleBlock = blocks.find(b => b.type === "title-page");
  const sortableBlocks = blocks.filter(b => b.type !== "title-page");
  const CHAPTER_COLORS = [ "chapterblue", "chapterpurple", "chaptergreen", "chapteramber" ];

  if (!project || (blocks.length === 1 && !isInitialized)) {
    return <div className="flex items-center justify-center h-full">Загрузка данных...</div>;
  }

  const getBlocksWithMetadata = (blocks: Block[]): EnrichedBlock[] => {
    let currentChapterIndex = -1;

    return blocks.map((block) => {
      if (block.type === "heading" && (block.content.level === 1)) {
        currentChapterIndex++;
      }

      return {
        ...block,
        chapterColor: currentChapterIndex >= 0 
          ? CHAPTER_COLORS[currentChapterIndex % CHAPTER_COLORS.length] 
          : null,
        isChapterRoot: block.type === "heading" && block.content.level <= 1
      };
    });
  };

  const enrichedBlocks = getBlocksWithMetadata(sortableBlocks);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Input
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          className="max-w-md font-display font-semibold border-none bg-transparent text-foreground focus-visible:ring-0 px-2"
        />
        <div className="flex-1" />
        <Select
          value={project.status}
          onValueChange={v => updateProject(projectId!, { status: v as any })}
        >
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Активный</SelectItem>
            <SelectItem value="inProgress">В работе</SelectItem>
            <SelectItem value="done">Завершён</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSave} size="sm" className="gap-2">
          {!isSaving ? (
            <Save className="w-3.5 h-3.5" />
          ) : (
            <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
          )}
          Сохранить
        </Button>
        <Button variant="outline" disabled={isDownloading? true : false} onClick={handleDownload} size="sm" className="gap-2">
          {!isDownloading ? (
            <Download className="w-3.5 h-3.5" />
          ) : (
            <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
          )}Скачать
        </Button>
      </header>

      {/* Editor + Preview */}
        <ResizablePanelGroup direction={isMobile? "vertical" : "horizontal"} className="flex-1 h-full min-h-0 overflow-hidden">
          <ResizablePanel defaultSize={50} minSize={30} className="h-full min-h-0 overflow-hidden">
            <div className="h-full overflow-y-auto bg-background">
              <div className="max-w-3xl mx-auto py-8 px-4 space-y-3">
                {/* Title page block — always first, not draggable */}
                {titleBlock && (
                  <Card className="border-border border-primary/20 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-primary/5">
                        <Lock className="w-3.5 h-3.5 text-primary/50" />
                        <span className="text-xs text-primary font-medium uppercase tracking-wider flex-1">
                          Титульный лист
                        </span>
                      </div>
                      <div className="p-4">
                        <BlockEditor block={titleBlock} onChange={content => updateBlock(titleBlock.id, content)} isSaved={isSaved} />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Auto-generated TOC indicator */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-dashed border-border">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Содержание — генерируется автоматически из заголовков</span>
                </div>

                {/* Sortable content blocks */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={enrichedBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    {enrichedBlocks.map((block, idx) => (
                      <SortableBlockCard
                        key={block.id}
                        block={block}
                        index={idx}
                        totalCount={enrichedBlocks.length}
                        onMove={(dir) => moveBlock(block.id, dir)} 
                        onRemove={() => removeBlock(block.id)}
                        onUpdate={(content) => updateBlock(block.id, content)}
                        isSaved={isSaved}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                {sortableBlocks.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Type className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Добавьте блоки контента</p>
                  </div>
                )}

                <div className="relative flex justify-center pt-2">
                  <Button variant="outline" size="sm" onClick={() => setAddMenuOpen(!addMenuOpen)} className="gap-2 text-muted-foreground">
                    <Plus className="w-4 h-4" /> Добавить блок
                  </Button>
                  {addMenuOpen && (
                    <div className="absolute top-full mt-2 bg-card border border-border rounded-lg shadow-lg p-2 z-10 flex gap-1 animate-fade-in" ref={menuContainerRef}>
                      {BLOCK_TYPES.map(bt => (
                        <button key={bt.type} onClick={() => addBlock(bt.type as Block["type"])}
                          className="flex flex-col items-center gap-1 px-3 py-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs">
                          <bt.icon className="w-4 h-4" />
                          {bt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />
  
          <ResizablePanel defaultSize={50} minSize={25} className="h-full min-h-0 overflow-hidden">
            <DocumentPreview blocks={blocks} projectName={projectName} projectType={project.type}/>
          </ResizablePanel>
        </ResizablePanelGroup>
    </div>
  );
}

/* ---- Sortable Block Card ---- */

interface SortableBlockCardProps {
  block: EnrichedBlock;
  index: number;
  totalCount: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onUpdate: (content: Record<string, any>) => void;
  isSaved: boolean;
}

function SortableBlockCard({ block, index, totalCount, onMove, onRemove, onUpdate, isSaved }: SortableBlockCardProps) {

  const [isCollapsed, setIsCollapsed] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const label = block.type === "heading" ? "Заголовок"
    : block.type === "text" ? "Текст"
    : block.type === "image" ? "Изображение"
    : block.type === "table" ? "Таблица"
    : block.type;

  const chapterBgMap = {
    chapterblue: "bg-chapterblue/50",
    chapterpurple: "bg-chapterpurple/50",
    chaptergreen: "bg-chaptergreen/50",
    chapteramber: "bg-chapteramber/50",
  };

  const chapterBgLightMap = {
    chapterblue: "bg-chapterblue/20",
    chapterpurple: "bg-chapterpurple/20",
    chaptergreen: "bg-chaptergreen/20",
    chapteramber: "bg-chapteramber/20",
  };



  return (
    <div ref={setNodeRef} style={style} className="relative overflow-hidden">

      <Collapsible open={block.type === "text" ? !isCollapsed : true}>
        <Card className="group border-border hover:border-primary/20 transition-colors overflow-hidden">
          <CardContent className="p-0">
            <div className={cn(
                "flex items-center gap-1 px-3 py-2 border-b border-border transition-colors",
                block.chapterColor &&
                  (block.isChapterRoot
                    ? chapterBgMap[block.chapterColor]
                    : chapterBgLightMap[block.chapterColor])
              )}>
              <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/50 hover:text-muted-foreground">
                <GripVertical className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex-1">
                {label}
                {block.type === "text" && (
                  <CollapsibleTrigger>
                    <button onClick={() => setIsCollapsed(isCollapsed? false : true)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                      {isCollapsed ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                )}
              </span>

              <button onClick={() => onMove(-1)} disabled={index === 0}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onMove(1)} disabled={index === totalCount - 1}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button onClick={onRemove}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <CollapsibleContent>
              <div className="p-4">
                <BlockEditor block={block} onChange={onUpdate} isSaved={isSaved} />
              </div>
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>
    </div>
  );
}

/* ---- Block Editor ---- */

function BlockEditor({ block, onChange, isSaved }: { block: Block; onChange: (c: Record<string, any>) => void, isSaved: boolean}) {
  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-2">
          <Select value={String(block.content.level)} onValueChange={v => onChange({ ...block.content, level: Number(v) })}>
            <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">H1</SelectItem>
              <SelectItem value="2">H2</SelectItem>
              <SelectItem value="3">H3</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={block.content.text}
            onChange={e => onChange({ ...block.content, text: e.target.value })}
            className={cn(
              "border-none bg-transparent px-0 focus-visible:ring-0 font-display font-bold",
              block.content.level === 1 && "text-2xl",
              block.content.level === 2 && "text-xl",
              block.content.level === 3 && "text-lg",
            )}
            placeholder="Введите заголовок..."
          />
        </div>
      );

    case "text":
      return (
          <Textarea
            value={block.content.text}
            onChange={e => onChange({ ...block.content, text: e.target.value })}
            placeholder="Введите текст..."
            className="min-h-[100px] field-sizing-content border-none bg-transparent px-0 focus-visible:ring-0 leading-relaxed indent-8"
          />
      );

    case "title-page":
      const unis = [
        { key: "БГЭУ", label: "БЕЛОРУССКИЙ ГОСУДАРСТВЕННЫЙ ЭКОНОМИЧЕСКИЙ УНИВЕРСИТЕТ" },
        { key: "БГУ", label: "БЕЛОРУССКИЙ ГОСУДАРСТВЕННЫЙ УНИВЕРСИТЕТ" },
      ];

      const selectedUni = unis.find(u => u.label === block.content.university);

      return (
        <div className="space-y-3">
          <div key="university" className="grid grid-cols-[140px_1fr] items-center gap-2">
            <label className="text-xs text-muted-foreground font-medium">Учебное заведение</label>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-8 justify-start font-normal text-sm overflow-hidden">
                  {selectedUni ? selectedUni.key : "Выберите ВУЗ"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-w-[300px]">
                {unis.map(u => (
                  <DropdownMenuItem 
                    className="focus:bg-muted group"
                    key={u.key} 
                    onSelect={() => onChange({ ...block.content, university: u.label })}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold group-focus:text-[oklch(13%_0.028_261.692)]">{u.key}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{u.label}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                  <DropdownMenuLabel className="font-normal text-[11px] text-muted-foreground italic bg-muted/30 mt-1 py-2">
                    В скором времени мы добавим и другие ВУЗы
                  </DropdownMenuLabel>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {[
            { key: "department", label: "Кафедра"},
            { key: "subject", label: "Наименование предмета"},
            { key: "title", label: "Тема работы" },
            { key: "studentName", label: "ФИО студента" },
            { key: "faculty", label: "Факультет", placeholder: "н.п. ФЦЭ"},
            { key: "studying_year", label: "Курс" },
            { key: "group", label: "Группа" },
            { key: "teacherName", label: "ФИО руководителя" },
            { key: "jobTitle", label: "Должность руководителя"},
            { key: "city", label: "Город" },
            { key: "year", label: "Год" },
          ].map(f => (
            <div key={f.key} className="grid grid-cols-[140px_1fr] items-center gap-2">
              <label className="text-xs text-muted-foreground font-medium">{f.label}</label>
              <Input
                value={block.content[f.key] || ""}
                onChange={e => onChange({ ...block.content, [f.key]: e.target.value })}
                className="h-8 text-sm"
                placeholder={f.placeholder ? f.placeholder : ''}
              />
            </div>
          ))}
        </div>
      );

    case "image":
      return (
        <ImageBlockEditor 
          isSaved={isSaved}
          content={block.content} 
          onChange={onChange} 
        />
      );

    case "table": {
      const rows = block.content.rows || 3;
      const cols = block.content.cols || 3;
      const data: string[] = block.content.data || Array(rows * cols).fill("");
      return (
        <div className="space-y-3">
          <div key="naming" className="grid grid-cols-[140px_1fr] items-center gap-2">
              <label className="text-xs text-muted-foreground font-medium">Подпись к таблице</label>
              <Input
                value={block.content["naming"] || ""}
                onChange={e => onChange({ ...block.content, "naming": e.target.value })}
                className="h-8 text-sm"
                placeholder="Название таблицы"
              />
          </div>
          <div key="source" className="grid grid-cols-[140px_1fr] items-center gap-2">
              <label className="text-xs text-muted-foreground font-medium">Подпись к таблице</label>
              <Input
                value={block.content["source"] || "Примечание - Источник:"}
                onChange={e => onChange({ ...block.content, "source": e.target.value })}
                className="h-8 text-sm"
                placeholder="Н.п. Примечание - Источник: собственная разработка"
              />
          </div>
          <div className="flex gap-3 items-center">
            <label className="text-xs text-muted-foreground">Строки</label>
            <Input type="number" min={1} max={20} value={rows}
              onChange={e => {
                const newRows = Number(e.target.value);
                const newData = Array(newRows * cols).fill("").map((_, i) => data[i] || "");
                onChange({ ...block.content, rows: newRows, data: newData });
              }}
              className="w-16 h-7 text-xs" />
            <label className="text-xs text-muted-foreground">Столбцы</label>
            <Input type="number" min={1} max={10} value={cols}
              onChange={e => {
                const newCols = Number(e.target.value);
                const newData = Array(rows * newCols).fill("");
                for (let r = 0; r < rows; r++) {
                  for (let c = 0; c < Math.min(cols, newCols); c++) {
                    newData[r * newCols + c] = data[r * cols + c] || "";
                  }
                }
                onChange({ ...block.content, cols: newCols, data: newData });
              }}
              className="w-16 h-7 text-xs" />
          </div>
          <div className="overflow-x-auto border border-border rounded-md">
            <table className="w-full text-sm">
              <tbody>
                {Array.from({ length: rows }).map((_, r) => (
                  <tr key={r} className={r === 0 ? "bg-muted/50" : ""}>
                    {Array.from({ length: cols }).map((_, c) => (
                      <td key={c} className="border border-border p-0">
                        <input
                          value={data[r * cols + c] || ""}
                          onChange={e => {
                            const newData = [...data];
                            newData[r * cols + c] = e.target.value;
                            onChange({ ...block.content, data: newData });
                          }}
                          className="w-full px-2 py-1.5 bg-transparent text-foreground outline-none text-xs"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    default:
      return <p className="text-sm text-muted-foreground">Неизвестный тип блока</p>;
  }
}
