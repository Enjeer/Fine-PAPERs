import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/axios";
import {
  getActiveOperation,
  startOperationPolling,
} from "@/lib/ai-operation-polling";
import { useProjects } from "@/lib/projects-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Chapter = { id?: string; title: string; order?: number };
type Subsection = {
  chapter_id?: string;
  chapter_title: string;
  items: Array<{ id?: string; title: string; order?: number }>;
};
type PlannedBlock = {
  id: string;
  type: "text" | "table" | "chart" | "diagram";
  title: string;
  description: string;
  paragraphs?: number;
};
type PlanSection = {
  chapter_id?: string;
  chapter_title: string;
  subsection_title: string;
  blocks: PlannedBlock[];
};
type Operation = {
  id: string;
  task_type: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  result: Record<string, unknown>;
  error: string;
  reserved_tokens: number;
  charged_tokens: number;
};
type Version = { id: number; stage: string; version: number; data: unknown };
type Pipeline = {
  id: string;
  status: string;
  requirements: Record<string, string>;
  structure: Chapter[];
  subsections: Subsection[];
  content_plan: PlanSection[];
  confirmed_steps: string[];
  last_error: string;
  operations: Operation[];
  versions: Version[];
};
type Account = {
  balance: number;
  plan: { code: string; name: string; features: string[] };
};

const STAGES = [
  ["structure", "Структура работы"],
  ["subsections", "Подзаголовки"],
  ["content_plan", "Смысловые блоки"],
  ["document", "Документ"],
];

function apiError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Не удалось выполнить запрос";
  }
  const candidate = error as {
    message?: unknown;
    response?: { data?: { error?: unknown; detail?: unknown } };
  };
  const message =
    candidate.response?.data?.error ||
    candidate.response?.data?.detail ||
    candidate.message;
  return typeof message === "string" ? message : "Не удалось выполнить запрос";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePlan(data: unknown): PlanSection[] {
  if (!Array.isArray(data)) return [];
  const usedIds = new Set<string>();
  return data.filter(isRecord).map((section) => ({
    ...section,
    blocks: Array.isArray(section.blocks)
      ? section.blocks.filter(isRecord).map((block) => {
          let id =
            typeof block.id === "string" && !usedIds.has(block.id)
              ? block.id
              : crypto.randomUUID();
          while (usedIds.has(id)) id = crypto.randomUUID();
          usedIds.add(id);
          const type = block.type;
          return {
            id,
            type:
              typeof type === "string" &&
              ["text", "table", "chart", "diagram"].includes(type)
                ? (type as PlannedBlock["type"])
                : "text",
            title:
              typeof block.title === "string" ? block.title : "Новый блок",
            description:
              typeof block.description === "string" ? block.description : "",
            paragraphs: Number(block.paragraphs) || 2,
          };
        })
      : [],
    chapter_title:
      typeof section.chapter_title === "string" ? section.chapter_title : "",
    subsection_title:
      typeof section.subsection_title === "string" ? section.subsection_title : "",
  }));
}

export default function AIAssistantPage() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const { getProject, refreshProjects } = useProjects();
  const navigate = useNavigate();
  const project = getProject(projectId);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [requirements, setRequirements] = useState<Record<string, string>>({
    topic: "",
    subject: "",
    goal: "",
    requirements: "",
    length: "",
    methodology: "",
    notes: "",
  });
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subsections, setSubsections] = useState<Subsection[]>([]);
  const [contentPlan, setContentPlan] = useState<PlanSection[]>([]);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const idempotencyKey = useRef<string | null>(null);

  const applyPipeline = useCallback((value: Pipeline) => {
    setPipeline(value);
    setOperation(getActiveOperation(value.operations));
    setRequirements((previous) => ({ ...previous, ...value.requirements }));
    const newest = (stage: string) =>
      value.versions
        .filter((version) => version.stage === stage)
        .sort((a, b) => b.version - a.version)[0]?.data;
    const outline = newest("structure") ?? value.structure;
    const headings = newest("subsections") ?? value.subsections;
    const plan = newest("content_plan") ?? value.content_plan;
    setChapters(Array.isArray(outline) ? outline : []);
    setSubsections(Array.isArray(headings) ? headings : []);
    setContentPlan(normalizePlan(plan));
  }, []);

  const loadPipeline = useCallback(async () => {
    const response = await api.get(`ai/projects/${projectId}/`);
    applyPipeline(response.data);
  }, [applyPipeline, projectId]);

  useEffect(() => {
    let active = true;
    Promise.all([api.get(`ai/projects/${projectId}/`), api.get("ai/account/")])
      .then(([pipelineResponse, accountResponse]) => {
        if (!active) return;
        applyPipeline(pipelineResponse.data);
        setAccount(accountResponse.data);
      })
      .catch((requestError) => {
        if (active) setError(apiError(requestError));
      });
    return () => {
      active = false;
    };
  }, [applyPipeline, projectId]);

  const activeOperationId = operation?.id;
  const activeOperationStatus = operation?.status;

  useEffect(() => {
    if (
      !activeOperationId ||
      !activeOperationStatus ||
      !["queued", "running"].includes(activeOperationStatus)
    ) {
      return;
    }
    return startOperationPolling<Operation>({
      operationId: activeOperationId,
      fetchOperation: async (id) => {
        const response = await api.get(`ai/operations/${id}/`);
        return response.data as Operation;
      },
      onUpdate: (updated) => {
        setOperation(updated);
        setError("");
      },
      onError: (requestError) => setError(apiError(requestError)),
      onComplete: async (updated) => {
        idempotencyKey.current = null;
        try {
          if (updated.status !== "succeeded") {
            setError(updated.error || "Операция отменена");
          }
          await loadPipeline();
          if (updated.status === "succeeded") await refreshProjects();
          const accountResponse = await api.get("ai/account/");
          setAccount(accountResponse.data);
        } catch (requestError) {
          setError(apiError(requestError));
        }
      },
    });
  }, [
    activeOperationId,
    activeOperationStatus,
    loadPipeline,
    refreshProjects,
  ]);

  const confirmed = pipeline?.confirmed_steps || [];
  const latestOperation = useMemo(
    () => pipeline?.operations?.[0],
    [pipeline],
  );
  const waiting = operation && ["queued", "running"].includes(operation.status);
  const stageIsConfirmed = (stage: string) => confirmed.includes(stage);

  const saveRequirements = async () => {
    await api.patch(`ai/projects/${projectId}/`, { requirements });
    if (requirements.topic.trim()) {
      await api.patch(`projects/${projectId}/`, {
        name: requirements.topic.trim(),
      });
    }
  };

  const startOperation = async (
    taskType: string,
    payload: Record<string, unknown> = {},
  ) => {
    setBusy(true);
    setError("");
    try {
      if (taskType === "structure") await saveRequirements();
      const response = await api.post(
        `ai/projects/${projectId}/operations/`,
        { task_type: taskType, payload },
        {
          headers: {
            "Idempotency-Key":
              idempotencyKey.current || (idempotencyKey.current = crypto.randomUUID()),
          },
        },
      );
      setOperation(response.data);
      const accountResponse = await api.get("ai/account/");
      setAccount(accountResponse.data);
      await loadPipeline();
    } catch (requestError) {
      setError(apiError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const confirmStage = async (stage: string, data?: unknown) => {
    setBusy(true);
    setError("");
    try {
      const value =
        data ??
        (stage === "structure"
          ? chapters
          : stage === "subsections"
            ? subsections
            : stage === "content_plan"
              ? contentPlan
              : undefined);
      const response = await api.post(`ai/projects/${projectId}/confirm/`, {
        stage,
        ...(value === undefined ? {} : { data: value }),
      });
      applyPipeline(response.data);
      if (stage === "content_plan") await refreshProjects();
    } catch (requestError) {
      setError(apiError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const cancelOperation = async () => {
    if (!operation) return;
    try {
      const response = await api.post(`ai/operations/${operation.id}/cancel/`);
      setOperation(response.data);
      await loadPipeline();
      const accountResponse = await api.get("ai/account/");
      setAccount(accountResponse.data);
    } catch (requestError) {
      setError(apiError(requestError));
    }
  };

  const updateChapter = (index: number, title: string) => {
    setChapters((items) =>
      items.map((item, current) =>
        current === index ? { ...item, title } : item,
      ),
    );
  };

  const updateSubsection = (
    groupIndex: number,
    itemIndex: number,
    title: string,
  ) => {
    setSubsections((groups) =>
      groups.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              items: group.items.map((item, row) =>
                row === itemIndex ? { ...item, title } : item,
              ),
            }
          : group,
      ),
    );
  };

  const updateBlock = (
    sectionIndex: number,
    blockIndex: number,
    changes: Partial<PlannedBlock>,
  ) => {
    setContentPlan((sections) =>
      sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              blocks: section.blocks.map((block, row) =>
                row === blockIndex ? { ...block, ...changes } : block,
              ),
            }
          : section,
      ),
    );
  };

  if (!pipeline) {
    return (
      <div className="p-6">
        {error ? <p role="alert">{error}</p> : <p>Загружаем состояние проекта…</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={() => navigate("/projects")}>
            ← Проекты
          </Button>
          <h1 className="mt-2 text-2xl font-display font-bold">
            AI-ассистент документа
          </h1>
          <p className="text-sm text-muted-foreground">
            Этап: {pipeline.status}. Подтверждённые результаты сохраняются отдельно.
          </p>
        </div>
        {account && (
          <Card className="min-w-52">
            <CardContent className="p-4 text-sm">
              <div>{account.plan.name} · {account.balance} токенов</div>
              <div className="text-muted-foreground">
                Списание за ошибочную генерацию возвращается.
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" role="alert">
          {error}
        </div>
      )}
      {pipeline.last_error && !error && (
        <div className="rounded-md border border-destructive/40 p-3 text-sm" role="alert">
          Последняя ошибка: {pipeline.last_error}
        </div>
      )}
      {waiting && (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <span>
              {operation?.status === "queued" ? "Операция ожидает worker" : "AI выполняет операцию"}
              {" · резерв "}
              {operation?.reserved_tokens} токенов
            </span>
            <Button variant="outline" onClick={cancelOperation}>Отменить</Button>
          </CardContent>
        </Card>
      )}
      {operation?.status === "failed" && (
        <p className="text-sm text-destructive">Операция завершилась ошибкой: {operation.error}</p>
      )}
      {latestOperation?.status === "succeeded" && !waiting && (
        <p className="text-sm text-muted-foreground">
          Последняя операция: {latestOperation.task_type}, использовано {latestOperation.charged_tokens} токенов.
        </p>
      )}

      <Card>
        <CardHeader><CardTitle>1. Требования к работе</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {[
            ["topic", "Тема"],
            ["subject", "Предметная область"],
            ["goal", "Цель работы"],
            ["length", "Объём / требования к объёму"],
          ].map(([key, label]) => (
            <label key={key} className="space-y-1 text-sm">
              <span>{label}</span>
              <Input
                value={requirements[key] || ""}
                onChange={(event) =>
                  setRequirements((previous) => ({ ...previous, [key]: event.target.value }))
                }
              />
            </label>
          ))}
          {[
            ["requirements", "Требования к структуре"],
            ["methodology", "Методические указания"],
            ["notes", "Дополнительные пожелания"],
          ].map(([key, label]) => (
            <label key={key} className="space-y-1 text-sm md:col-span-2">
              <span>{label}</span>
              <Textarea
                value={requirements[key] || ""}
                onChange={(event) =>
                  setRequirements((previous) => ({ ...previous, [key]: event.target.value }))
                }
                rows={3}
              />
            </label>
          ))}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button
              onClick={() => startOperation("structure")}
              disabled={Boolean(waiting || busy || !requirements.topic.trim())}
            >
              {chapters.length ? "Перегенерировать структуру" : "Сгенерировать структуру"}
            </Button>
            {chapters.length > 0 && (
              <Button
                variant="outline"
                onClick={() => confirmStage("structure", chapters)}
                disabled={Boolean(waiting || busy)}
              >
                Подтвердить структуру
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {chapters.length > 0 && (
        <Card>
          <CardHeader><CardTitle>2. Структура</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {chapters.map((chapter, index) => (
              <div key={chapter.id || index} className="flex gap-2">
                <Input
                  value={chapter.title}
                  onChange={(event) => updateChapter(index, event.target.value)}
                  aria-label={`Название главы ${index + 1}`}
                />
                <Button
                  variant="outline"
                  onClick={() => setChapters((items) => items.filter((_, row) => row !== index))}
                  aria-label="Удалить главу"
                >
                  Удалить
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => setChapters((items) => [...items, { title: "", order: items.length + 1 }])}
            >
              Добавить главу
            </Button>
            <p className="text-xs text-muted-foreground">
              {stageIsConfirmed("structure") ? "Есть подтверждённая версия." : "Проверьте и подтвердите результат."}
            </p>
          </CardContent>
        </Card>
      )}

      {stageIsConfirmed("structure") && (
        <Card>
          <CardHeader><CardTitle>3. Подзаголовки</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => startOperation("subsections", { chapters })}
              disabled={Boolean(waiting || busy || !chapters.length)}
            >
              {subsections.length ? "Перегенерировать подзаголовки" : "Сгенерировать подзаголовки"}
            </Button>
            {subsections.map((group, groupIndex) => (
              <section key={group.chapter_id || groupIndex} className="space-y-2 rounded-md border p-3">
                <h3 className="font-medium">{group.chapter_title}</h3>
                {group.items.map((item, itemIndex) => (
                  <Input
                    key={item.id || itemIndex}
                    value={item.title}
                    onChange={(event) => updateSubsection(groupIndex, itemIndex, event.target.value)}
                    aria-label="Название подзаголовка"
                  />
                ))}
                <Button
                  variant="outline"
                  onClick={() =>
                    setSubsections((groups) =>
                      groups.map((value, index) =>
                        index === groupIndex
                          ? { ...value, items: [...value.items, { title: "", order: value.items.length + 1 }] }
                          : value,
                      ),
                    )
                  }
                >
                  Добавить подзаголовок
                </Button>
              </section>
            ))}
            {subsections.length > 0 && (
              <Button
                variant="outline"
                onClick={() => confirmStage("subsections", subsections)}
                disabled={Boolean(waiting || busy)}
              >
                Подтвердить подзаголовки
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {stageIsConfirmed("subsections") && (
        <Card>
          <CardHeader><CardTitle>4. План содержательных блоков</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => startOperation("content_plan", { subsections })}
              disabled={Boolean(waiting || busy)}
            >
              {contentPlan.length ? "Перегенерировать план" : "Составить план блоков"}
            </Button>
            {contentPlan.map((section, sectionIndex) => (
              <section key={`${section.chapter_title}-${section.subsection_title}-${sectionIndex}`} className="space-y-3 rounded-md border p-3">
                <h3 className="font-medium">
                  {section.chapter_title} · {section.subsection_title}
                </h3>
                {section.blocks.map((block, blockIndex) => (
                  <div key={block.id} className="grid gap-2 rounded border p-3 md:grid-cols-[1fr_150px]">
                    <div className="space-y-2">
                      <Input
                        value={block.title}
                        onChange={(event) => updateBlock(sectionIndex, blockIndex, { title: event.target.value })}
                        aria-label="Название смыслового блока"
                      />
                      <Textarea
                        value={block.description}
                        onChange={(event) => updateBlock(sectionIndex, blockIndex, { description: event.target.value })}
                        aria-label="Описание смыслового блока"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <select
                        className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                        value={block.type}
                        onChange={(event) =>
                          updateBlock(sectionIndex, blockIndex, {
                            type: event.target.value as PlannedBlock["type"],
                          })
                        }
                        aria-label="Тип содержимого"
                      >
                        <option value="text">Текст</option>
                        <option value="table">Таблица</option>
                        <option value="chart">График</option>
                        <option value="diagram">Диаграмма процесса</option>
                      </select>
                      <Button
                        className="w-full"
                        variant="outline"
                        disabled={Boolean(waiting || busy)}
                        onClick={() => startOperation(block.type, {
                          block_id: block.id,
                          title: block.title,
                          description: block.description,
                          paragraphs: block.paragraphs || 2,
                          subsection_title: section.subsection_title,
                        })}
                      >
                        {project?.blocks.some((saved) => saved.id === block.id)
                          ? "Перегенерировать"
                          : "Сгенерировать"}
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() =>
                    setContentPlan((sections) =>
                      sections.map((value, index) =>
                        index === sectionIndex
                          ? {
                              ...value,
                              blocks: [
                                ...value.blocks,
                                {
                                  id: crypto.randomUUID(),
                                  type: "text",
                                  title: "Новый смысловой блок",
                                  description: "",
                                  paragraphs: 2,
                                },
                              ],
                            }
                          : value,
                      ),
                    )
                  }
                >
                  Добавить смысловой блок
                </Button>
              </section>
            ))}
            {contentPlan.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => confirmStage("content_plan", contentPlan)}
                  disabled={Boolean(waiting || busy)}
                >
                  Подтвердить план
                </Button>
                {stageIsConfirmed("content_plan") && (
                  <Button
                    onClick={() => confirmStage("document")}
                    disabled={Boolean(waiting || busy)}
                  >
                    Завершить pipeline
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Хронология операций</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pipeline.operations.map((item) => (
            <div key={item.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm">
              <span>{item.task_type} · {item.status}</span>
              <span>{item.charged_tokens || item.reserved_tokens} токенов</span>
            </div>
          ))}
          {pipeline.versions.map((version) => (
            <div key={version.id} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Версия {version.version} · {version.stage}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={Boolean(waiting || busy)}
                onClick={async () => {
                  try {
                    await api.post(
                      `ai/projects/${projectId}/versions/${version.id}/restore/`,
                    );
                    await loadPipeline();
                    await refreshProjects();
                  } catch (requestError) {
                    setError(apiError(requestError));
                  }
                }}
              >
                Восстановить
              </Button>
            </div>
          ))}
          {account?.balance === 0 && (
            <p className="pt-2 text-sm text-muted-foreground">
              Баланс пуст. Покупки токенов не включены; администратор может начислить токены через API.
            </p>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => navigate(`/projects/${projectId}`)}>
          Открыть редактор
        </Button>
      </div>
    </div>
  );
}
