import { type Block } from "@/lib/projects-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface DocumentPreviewProps {
  blocks: Block[];
  projectName: string;
  projectType: string;
}

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PAGE_PADDING_X_MM = 25;
const PAGE_PADDING_TOP_MM = 20;
const PAGE_PADDING_BOTTOM_MM = 20;
const PX_PER_MM = 96 / 25.4;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - PAGE_PADDING_X_MM * 2;
const CONTENT_HEIGHT_MM =
  PAGE_HEIGHT_MM - PAGE_PADDING_TOP_MM - PAGE_PADDING_BOTTOM_MM;
const CONTENT_WIDTH_PX = CONTENT_WIDTH_MM * PX_PER_MM;
const CONTENT_HEIGHT_PX = CONTENT_HEIGHT_MM * PX_PER_MM;

const PAGE_STYLE =
  "bg-white text-black shadow-lg w-[210mm] h-[297mm] text-[12pt] leading-[1.5] relative overflow-hidden flex flex-col shrink-0 mb-8";

const FONT_STYLE = {
  fontFamily: "'Times New Roman', Times, serif",
  fontWeight: 400 as const,
  fontSize: "12pt",
  lineHeight: 1.5,
  width: `${PAGE_WIDTH_MM}mm`,
  height: `${PAGE_HEIGHT_MM}mm`,
  paddingTop: `${PAGE_PADDING_TOP_MM}mm`,
  paddingRight: `${PAGE_PADDING_X_MM}mm`,
  paddingBottom: `${PAGE_PADDING_BOTTOM_MM}mm`,
  paddingLeft: `${PAGE_PADDING_X_MM}mm`,
  boxSizing: "border-box" as const,
};

const MEASURE_PAGE_STYLE: React.CSSProperties = {
  position: "absolute",
  left: "-100000px",
  top: 0,
  width: `${CONTENT_WIDTH_MM}mm`,
  height: `${CONTENT_HEIGHT_MM}mm`,
  visibility: "hidden",
  pointerEvents: "none",
  overflow: "hidden",
  fontFamily: "'Times New Roman', Times, serif",
  fontWeight: 400,
  fontSize: "12pt",
  lineHeight: 1.5,
  boxSizing: "border-box",
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const splitIntoParagraphs = (text: string) => text.split("\n");

function blockToMeasureHtml(block: Block) {
  switch (block.type) {
    case "heading": {
      const level = clamp(Number(block.content.level || 1), 1, 3);
      const className =
        level === 1
          ? "text-[16pt] font-bold mt-2 mb-4 text-center uppercase break-words preview"
          : "text-[14pt] font-bold mt-6 mb-3 break-words preview";
      return `<h${level} class="${className}">${escapeHtml(block.content.text)}</h${level}>`;
    }
    case "text": {
      const paragraphs = splitIntoParagraphs(block.content.text || "")
        .map(
          (paragraph) =>
            `<p class="indent-[1.25cm] leading-[1.5] mb-2 break-words text-justify">${escapeHtml(paragraph)}</p>`,
        )
        .join("");
      return `<div class="mb-2 text-justify break-words">${paragraphs}</div>`;
    }
    case "image": {
      if (!block.content.url) {
        return `<div class="my-6 p-4 border border-dashed text-muted-foreground">[Изображение]</div>`;
      }
      return `<div class="my-6 text-center"><figure class="inline-block"><img data-measure-image="true" src="${escapeHtml(block.content.url)}" class="max-h-[100mm] max-w-full object-contain mx-auto border" /><figcaption class="text-[11pt] italic mt-2">Рисунок — ${escapeHtml(block.content.caption)}</figcaption><figcaption class="text-[11pt] italic mt-2">Примечание — Источник: ${escapeHtml(block.content.source)}</figcaption></figure></div>`;
    }
    case "table": {
      const rows = Number(block.content.rows || 1);
      const cols = Number(block.content.cols || 1);
      const data: string[] = Array.isArray(block.content.data)
        ? block.content.data
        : [];
      const body = Array.from({ length: rows })
        .map((_, rowIndex) => {
          const cells = Array.from({ length: cols })
            .map(
              (_, colIndex) =>
                `<td class="border border-black px-2 py-1 break-words overflow-hidden">${escapeHtml(data[rowIndex * cols + colIndex] || "")}</td>`,
            )
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      return `<div class="my-4"><figure class="inline-block"><figcaption class="text-[11pt] italic mt-2">Таблица 0 - ${escapeHtml(block.content.naming)}</figcaption><table class="w-full border-collapse border border-black table-fixed text-[11pt]"><tbody>${body}</tbody></table><figcaption class="text-[11pt] italic mt-2 text-center">${escapeHtml(block.content.source)}</figcaption></figure></div>`;
    }
    default:
      return "";
  }
}

function createMeasureElement(block: Block) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = blockToMeasureHtml(block);
  return wrapper.firstElementChild as HTMLElement | null;
}

async function waitForImages(container: HTMLElement) {
  const images = Array.from(
    container.querySelectorAll<HTMLImageElement>(
      'img[data-measure-image="true"]',
    ),
  );

  if (images.length === 0) return;

  await Promise.all(
    images.map(async (image) => {
      try {
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            const done = () => resolve();
            image.addEventListener("load", done, { once: true });
            image.addEventListener("error", done, { once: true });
          });
        }
        if (typeof image.decode === "function") {
          await image.decode().catch(() => undefined);
        }
      } catch {
        // Keep the pagination pass alive if an image cannot be decoded.
      }
    }),
  );
}

function getBlockHeight(measurePage: HTMLElement, element: HTMLElement) {
  measurePage.appendChild(element);
  const height = element.getBoundingClientRect().height;
  measurePage.removeChild(element);
  return height;
}

function getPageHeight(measurePage: HTMLElement) {
  return measurePage.scrollHeight;
}

function findFittingTextPrefix(
  measurePage: HTMLElement,
  block: Block,
  text: string,
  availableHeight: number,
) {
  const makeCandidate = (candidateText: string) =>
    createMeasureElement({
      ...block,
      content: { ...block.content, text: candidateText },
    });

  if (!text) return "";

  const tokens = text.split(/(\s+)/);
  let low = 0;
  let high = tokens.length;
  let best = "";

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = tokens.slice(0, mid).join("").trimEnd();
    const element = makeCandidate(candidate);
    if (!element) break;

    measurePage.appendChild(element);
    const fits = measurePage.scrollHeight <= availableHeight + 0.5;
    measurePage.removeChild(element);

    if (fits) {
      best = candidate;
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  if (best) return best;

  // A single very long token may need CSS break-words to split inside the word.
  let charLow = 1;
  let charHigh = text.length;
  let charBest = "";
  while (charLow <= charHigh) {
    const mid = Math.floor((charLow + charHigh) / 2);
    const candidate = text.slice(0, mid);
    const element = makeCandidate(candidate);
    if (!element) break;

    measurePage.appendChild(element);
    const fits = measurePage.scrollHeight <= availableHeight + 0.5;
    measurePage.removeChild(element);

    if (fits) {
      charBest = candidate;
      charLow = mid + 1;
    } else {
      charHigh = mid - 1;
    }
  }

  return charBest.trimEnd();
}

function findFittingTableRows(
  measurePage: HTMLElement,
  block: Block,
  availableHeight: number,
) {
  const totalRows = Number(block.content.rows || 0);
  const cols = Number(block.content.cols || 0);
  const data: string[] = Array.isArray(block.content.data)
    ? block.content.data
    : [];

  const makeCandidate = (rowCount: number) =>
    createMeasureElement({
      ...block,
      content: {
        ...block.content,
        rows: rowCount,
        data: data.slice(0, rowCount * cols),
      },
    });

  let low = 1;
  let high = totalRows;
  let best = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const element = makeCandidate(mid);
    if (!element) break;
    measurePage.appendChild(element);
    const fits = measurePage.scrollHeight <= availableHeight + 0.5;
    measurePage.removeChild(element);

    if (fits) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

export default function DocumentPreview({
  blocks,
  projectType,
}: DocumentPreviewProps) {
  const [paginatedPages, setPaginatedPages] = useState<Block[][]>([]);
  const [tocEntries, setTocEntries] = useState<
    { text: string; level: number; page: number }[]
  >([]);
  const [isCalculating, setIsCalculating] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    const updateZoom = () => {
      if (!containerRef.current) return;
      const availableWidth = Math.max(containerRef.current.clientWidth - 48, 1);
      const a4WidthPx = PAGE_WIDTH_MM * PX_PER_MM;
      setZoomLevel(Math.min(availableWidth / a4WidthPx, 1));
    };

    const observer = new ResizeObserver(updateZoom);
    if (containerRef.current) observer.observe(containerRef.current);
    updateZoom();
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    let cancelled = false;

    const calculatePages = async () => {
      const measurePage = measureRef.current;
      if (!measurePage || blocks.length === 0) {
        setPaginatedPages([]);
        setTocEntries([]);
        setIsCalculating(false);
        return;
      }

      setIsCalculating(true);
      measurePage.innerHTML = "";

      if (document.fonts?.ready) {
        await document.fonts.ready.catch(() => undefined);
      }
      if (cancelled) return;

      const contentBlocks = blocks.filter((b) => b.type !== "title-page");
      const pages: Block[][] = [];
      let currentPageBlocks: Block[] = [];

      const resetMeasurePage = () => {
        measurePage.innerHTML = "";
      };

      const finalizePage = () => {
        if (currentPageBlocks.length > 0) {
          pages.push(currentPageBlocks);
          currentPageBlocks = [];
        }
        resetMeasurePage();
      };

      const pageAvailableHeight = CONTENT_HEIGHT_PX;

      for (const block of contentBlocks) {
        if (cancelled) return;

        if (
          block.type === "heading" &&
          Number(block.content.level || 1) === 1 &&
          currentPageBlocks.length > 0
        ) {
          finalizePage();
        }

        if (block.type === "text") {
          let remainingText = block.content.text || "";

          while (remainingText.length > 0) {
            if (cancelled) return;

            const candidate = {
              ...block,
              content: { ...block.content, text: remainingText },
            };
            const candidateElement = createMeasureElement(candidate);

            if (candidateElement) {
              measurePage.appendChild(candidateElement);
              const fits =
                measurePage.scrollHeight <= pageAvailableHeight + 0.5;
              measurePage.removeChild(candidateElement);

              if (fits) {
                currentPageBlocks.push(candidate);
                measurePage.appendChild(candidateElement);
                break;
              }
            }

            const prefix = findFittingTextPrefix(
              measurePage,
              block,
              remainingText,
              pageAvailableHeight,
            );

            if (prefix) {
              const chunk = {
                ...block,
                content: { ...block.content, text: prefix },
              };
              const chunkElement = createMeasureElement(chunk);
              if (chunkElement) measurePage.appendChild(chunkElement);
              currentPageBlocks.push(chunk);
              remainingText = remainingText.slice(prefix.length).trimStart();
              finalizePage();
              continue;
            }

            if (currentPageBlocks.length > 0) {
              finalizePage();
              continue;
            }

            // Defensive fallback for an exceptionally long unbreakable token.
            const fallback = remainingText.slice(0, 1);
            const chunk = {
              ...block,
              content: { ...block.content, text: fallback },
            };
            const chunkElement = createMeasureElement(chunk);
            if (chunkElement) measurePage.appendChild(chunkElement);
            currentPageBlocks.push(chunk);
            remainingText = remainingText.slice(1);
            finalizePage();
          }

          continue;
        }

        if (block.type === "table") {
          const rows = Number(block.content.rows || 0);
          const cols = Number(block.content.cols || 0);
          const data: string[] = Array.isArray(block.content.data)
            ? block.content.data
            : [];
          let startRow = 0;

          while (startRow < rows) {
            const remainingBlock = {
              ...block,
              content: {
                ...block.content,
                rows: rows - startRow,
                data: data.slice(startRow * cols),
              },
            };

            const availableRows = findFittingTableRows(
              measurePage,
              remainingBlock,
              pageAvailableHeight,
            );

            if (availableRows === 0) {
              if (currentPageBlocks.length > 0) {
                finalizePage();
                continue;
              }

              // Keep at least one row on an empty page to avoid infinite loops.
              const oneRow = {
                ...remainingBlock,
                content: {
                  ...remainingBlock.content,
                  rows: 1,
                  data: data.slice(startRow * cols, (startRow + 1) * cols),
                },
              };
              const oneRowElement = createMeasureElement(oneRow);
              if (oneRowElement) measurePage.appendChild(oneRowElement);
              currentPageBlocks.push(oneRow);
              startRow += 1;
              finalizePage();
              continue;
            }

            const chunk = {
              ...remainingBlock,
              content: {
                ...remainingBlock.content,
                rows: availableRows,
                data: data.slice(
                  startRow * cols,
                  (startRow + availableRows) * cols,
                ),
              },
            };
            const chunkElement = createMeasureElement(chunk);
            if (chunkElement) measurePage.appendChild(chunkElement);
            currentPageBlocks.push(chunk);
            startRow += availableRows;

            if (startRow < rows) finalizePage();
          }

          continue;
        }

        const element = createMeasureElement(block);
        if (!element) continue;

        if (block.type === "image") {
          await waitForImages(element);
          if (cancelled) return;
        }

        measurePage.appendChild(element);
        const fits = measurePage.scrollHeight <= pageAvailableHeight + 0.5;
        if (!fits && currentPageBlocks.length > 0) {
          measurePage.removeChild(element);
          finalizePage();
          measurePage.appendChild(element);
        }

        currentPageBlocks.push(block);
      }

      if (currentPageBlocks.length > 0) pages.push(currentPageBlocks);

      const hasTitle = blocks.some((b) => b.type === "title-page");
      const pageOffset = hasTitle ? 2 : 1;
      // Build TOC from the final page assignment rather than measuring it as content.
      const recalculatedToc: { text: string; level: number; page: number }[] =
        [];
      pages.forEach((page, pageIdx) => {
        page.forEach((pageBlock) => {
          if (pageBlock.type === "heading") {
            recalculatedToc.push({
              text: pageBlock.content.text || "",
              level: Number(pageBlock.content.level || 1),
              page: pageIdx + pageOffset + 1,
            });
          }
        });
      });

      if (!cancelled) {
        setPaginatedPages(pages);
        setTocEntries(recalculatedToc);
        setIsCalculating(false);
      }
    };

    calculatePages();

    return () => {
      cancelled = true;
    };
  }, [blocks]);

  const titleBlock = blocks.find((b) => b.type === "title-page");
  const allImages = blocks.filter((b) => b.type === "image");
  const allTables = blocks.filter((b) => b.type === "table");

  return (
    <div
      className="h-full w-full flex flex-col bg-muted/30 relative overflow-hidden"
      ref={containerRef}
    >
      <div ref={measureRef} style={MEASURE_PAGE_STYLE} />

      <div className="h-10 px-4 py-2 border-b border-border bg-card shrink-0 flex justify-between items-center z-10">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Предпросмотр
        </span>
        {isCalculating && (
          <span className="text-[10px] animate-pulse text-primary font-medium">
            Оптимизация страниц...
          </span>
        )}
      </div>

      <ScrollArea className="flex-1 w-full overflow-hidden">
        <div
          className="p-8 flex flex-col items-center gap-6 origin-top"
          style={{ zoom: zoomLevel }}
        >
          {blocks.length === 0 ? (
            <div className={PAGE_STYLE} style={FONT_STYLE}>
              <p className="text-gray-400 italic text-center mt-20">
                Документ пуст
              </p>
            </div>
          ) : (
            <>
              {titleBlock && (
                <div className={PAGE_STYLE} style={FONT_STYLE}>
                  <PreviewBlock
                    block={titleBlock}
                    imgNum={0}
                    tabNum={0}
                    projectType={projectType}
                  />
                </div>
              )}

              <div className={PAGE_STYLE} style={FONT_STYLE}>
                <h2 className="text-[16pt] font-bold text-center mb-8 uppercase">
                  Содержание
                </h2>
                <div className="space-y-1">
                  {tocEntries.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-baseline gap-1"
                      style={{ paddingLeft: `${(entry.level - 1) * 1.25}cm` }}
                    >
                      <span className={entry.level === 1 ? "font-bold" : ""}>
                        {entry.text}
                      </span>
                      <span className="flex-1 border-b border-dotted border-gray-400 mx-1 min-w-[1cm] translate-y-[-4px]" />
                      <span className="text-right tabular-nums">
                        {entry.page}
                      </span>
                    </div>
                  ))}
                </div>
                <PageNumber num={titleBlock ? 2 : 1} />
              </div>

              {paginatedPages.map((pageBlocks, pageIdx) => (
                <div key={pageIdx} className={PAGE_STYLE} style={FONT_STYLE}>
                  <div className="flex-1">
                    {pageBlocks.map((block, bIdx) => (
                      <PreviewBlock
                        key={`${pageIdx}-${bIdx}`}
                        block={block}
                        imgNum={
                          block.type === "image"
                            ? allImages.findIndex(
                                (img) => img.id === block.id,
                              ) + 1
                            : 0
                        }
                        tabNum={
                          block.type === "table"
                            ? allTables.findIndex(
                                (tab) => tab.id === block.id,
                              ) + 1
                            : 0
                        }
                        projectType={projectType}
                      />
                    ))}
                  </div>
                  <PageNumber num={pageIdx + (titleBlock ? 3 : 2)} />
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function PageNumber({ num }: { num: number }) {
  return (
    <span className="absolute bottom-[10mm] left-0 right-0 text-center text-[11pt]">
      {num}
    </span>
  );
}

function PreviewBlock({
  block,
  imgNum,
  tabNum,
  projectType,
}: {
  block: Block;
  imgNum: number;
  tabNum: number;
  projectType: string;
}) {
  const jobTitleSplit = (title: string) => title.split(",");

  const types: Record<string, string> = {
    course: "КУРСОВАЯ РАБОТА",
    essay: "ЭССЕ",
    lab: "ЛАБОРАТОРНАЯ РАБОТА",
    diplom: "ДИПЛОМНАЯ РАБОТА",
  };

  switch (block.type) {
    case "title-page": {
      const c = block.content;
      return (
        <div className="flex flex-col justify-between h-full text-center py-2">
          <div className="space-y-4">
            <div className="text-[11pt] leading-tight uppercase">
              <p>Министерство образования Республики Беларусь</p>
              <p>
                УО «
                {c.university ||
                  "БЕЛОРУССКИЙ ГОСУДАРСТВЕННЫЙ ЭКОНОМИЧЕСКИЙ УНИВЕРСИТЕТ"}
                »
              </p>
            </div>
            <div className="text-[14pt] mt-8">
              <p>
                Кафедра{" "}
                <span className="border-b border-black px-4">
                  {c.department || "________________"}
                </span>
              </p>
            </div>
          </div>
          <div className="space-y-6 flex flex-col items-center">
            <h1 className="text-[18pt] tracking-widest preview">
              {types[projectType]}
            </h1>
            <div className="text-[14pt] space-y-2 w-fit">
              <p>
                по дисциплине:{" "}
                <span className="font-medium w-fit">{c.subject || "..."}</span>
              </p>
              <p>
                на тему:{" "}
                <span className="font-medium w-fit">{c.title || "..."}</span>
              </p>
            </div>
          </div>
          <div className="self-end w-full text-left text-[11pt] space-y-4">
            <div className="flex flex-col gap-y-12 w-full max-w-4xl text-[14px] font-serif">
              <div className="grid grid-cols-[2fr_1fr_1.5fr] items-end gap-x-4">
                <div className="flex flex-col leading-tight">
                  <span className="mb-1">Студент</span>
                  <span>
                    {c.faculty}, {c.studying_year}-й курс, {c.group}
                  </span>
                </div>
                <div className="relative top-4 flex flex-col items-center text-[10px] leading-tight">
                  <span className="w-full text-center">(подпись)</span>
                  <span className="w-full text-center">(дата)</span>
                </div>
                <div className="font-bold text-right leading-tight">
                  {c.studentName}
                </div>
              </div>
              <div className="grid grid-cols-[2fr_1fr_1.5fr] items-end gap-x-4">
                <div className="flex flex-col leading-tight">
                  <span className="mb-1">Руководитель</span>
                  <span>{jobTitleSplit(c.jobTitle)[0]}</span>
                  {jobTitleSplit(c.jobTitle)[1] && (
                    <span>{jobTitleSplit(c.jobTitle)[1]}</span>
                  )}
                </div>
                <div className="relative top-4 flex flex-col items-center text-[10px] leading-tight">
                  <div className="flex justify-between w-full gap-2">
                    <span className="flex-1 text-center">(подпись)</span>
                    <span className="flex-1 text-center">(оценка)</span>
                  </div>
                  <span className="w-full text-center">(дата)</span>
                </div>
                <div className="font-bold text-right leading-tight">
                  {c.teacherName}
                </div>
              </div>
            </div>
          </div>
          <div className="text-[12pt] uppercase mt-4">
            {c.city || "МИНСК"} {c.year || "2024"}
          </div>
        </div>
      );
    }
    case "heading": {
      const level = Number(block.content.level || 1);
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      const styles =
        level === 1
          ? "text-[16pt] font-bold mt-2 mb-4 text-center uppercase break-words preview"
          : "text-[14pt] font-bold mt-6 mb-3 break-words preview";
      return <Tag className={styles}>{block.content.text}</Tag>;
    }
    case "text":
      return (
        <div className="mb-2 text-justify break-words">
          {(block.content.text || "").split("\n").map((p, i) => (
            <p key={i} className="indent-[1.25cm] leading-[1.5] mb-2">
              {p}
            </p>
          ))}
        </div>
      );
    case "image":
      return (
        <div className="my-6 text-center">
          {block.content.url ? (
            <figure className="inline-block">
              <img
                src={block.content.url}
                className="max-h-[100mm] max-w-full object-contain mx-auto border"
              />
              <figcaption className="text-[11pt] italic mt-2">
                Рисунок {imgNum} — {block.content.caption}
              </figcaption>
              <figcaption className="text-[11pt] italic mt-2">
                Примечание — Источник: {block.content.source}
              </figcaption>
            </figure>
          ) : (
            <div className="p-4 border border-dashed text-muted-foreground">
              [Изображение]
            </div>
          )}
        </div>
      );
    case "table": {
      const { rows = 1, cols = 1, data = [] } = block.content;
      return (
        <div className="my-4">
          <figure className="inline-block">
            <figcaption className="text-[11pt] italic mt-2">
              Таблица {tabNum} - {block.content.naming}
            </figcaption>
            <table className="w-full border-collapse border border-black table-fixed text-[11pt]">
              <tbody>
                {Array.from({ length: rows }).map((_, r) => (
                  <tr key={r}>
                    {Array.from({ length: cols }).map((_, c) => (
                      <td
                        key={c}
                        className="border border-black px-2 py-1 break-words overflow-hidden"
                      >
                        {data[r * cols + c] || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <figcaption className="text-[11pt] italic mt-2 text-center">
              {block.content.source}
            </figcaption>
          </figure>
        </div>
      );
    }
    default:
      return null;
  }
}
