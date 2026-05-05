import { type Block } from "@/lib/projects-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect, useRef, useLayoutEffect } from "react";

interface DocumentPreviewProps {
  blocks: Block[];
  projectName: string;
  projectType: string;
}

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PADDING_TOP_MM = 45;
const PADDING_BOTTOM_MM = 25;
const CONTENT_MAX_HEIGHT_PX = (PAGE_HEIGHT_MM - PADDING_TOP_MM - PADDING_BOTTOM_MM) * 3.78;

const PAGE_STYLE = "bg-white text-black shadow-lg w-[210mm] px-[25mm] py-[20mm] text-[12pt] leading-[1.5] relative overflow-hidden flex flex-col shrink-0 mb-8";
const FONT_STYLE = { 
  fontFamily: "'Times New Roman' serif",
  height: `${PAGE_HEIGHT_MM}mm`
};

export default function DocumentPreview({ blocks, projectType }: DocumentPreviewProps) {
  const [paginatedPages, setPaginatedPages] = useState<Block[][]>([]);
  const [tocEntries, setTocEntries] = useState<{text: string; level: number; page: number}[]>([]);
  const [isCalculating, setIsCalculating] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    const updateZoom = () => {
      if (!containerRef.current) return;
      const parentWidth = containerRef.current.offsetWidth;
      const availableWidth = parentWidth - 48; // padding
      const a4WidthPx = PAGE_WIDTH_MM * 3.78; 
      setZoomLevel(Math.min(availableWidth / a4WidthPx, 1));
    };
    const observer = new ResizeObserver(updateZoom);
    if (containerRef.current) observer.observe(containerRef.current);
    updateZoom();
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!measureRef.current || blocks.length === 0) {
      setPaginatedPages([]);
      setIsCalculating(false);
      return;
    }

    setIsCalculating(true);
    
    const queue = JSON.parse(JSON.stringify(blocks.filter(b => b.type !== "title-page")));
    const pages: Block[][] = [];
    let currentPageBlocks: Block[] = [];
    let currentTOC: {text: string; level: number; page: number}[] = [];
    let currentHeight = 0;

    const hasTitle = blocks.some(b => b.type === "title-page");
    const offset = hasTitle ? 2 : 1;

    const measureContainer = measureRef.current;
    measureContainer.innerHTML = '';

    const measureHtml = (html: string) => {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const el = temp.firstElementChild as HTMLElement;
      measureContainer.appendChild(el);
      const h = el.offsetHeight;
      measureContainer.removeChild(el);
      return h;
    };

    while (queue.length > 0) {
      const block = queue.shift()!;

      if (block.type === 'heading') {
        const isH1 = (block.content.level || 1) === 1;
        const h = measureHtml(`<h${block.content.level} class="${isH1 ? 'text-[16pt] font-bold mt-2 mb-3 text-center' : 'text-[14pt] font-bold mt-5 mb-2'}">${block.content.text}</h${block.content.level}>`);

        if ((currentHeight + h > CONTENT_MAX_HEIGHT_PX) || (isH1 && currentPageBlocks.length > 0)) {
          pages.push(currentPageBlocks);
          currentPageBlocks = [block];
          currentHeight = h;
        } else {
          currentPageBlocks.push(block);
          currentHeight += h;
        }

        currentTOC.push({
          text: block.content.text || "",
          level: block.content.level || 1,
          page: pages.length + offset + 1
        });
      } 
      
      else if (block.type === 'text') {
        const paragraphs = (block.content.text || "").split('\n');
        const fits: string[] = [];
        const remaining: string[] = [];
        let tempHeight = currentHeight;

        for (const p of paragraphs) {
          const h = measureHtml(`<p class="indent-[1.25cm] mb-2 text-justify">${p}</p>`);
          if (tempHeight + h <= CONTENT_MAX_HEIGHT_PX) {
            fits.push(p);
            tempHeight += h;
          } else {
            remaining.push(p);
          }
        }

        if (fits.length > 0) {
          currentPageBlocks.push({ ...block, content: { ...block.content, text: fits.join('\n') } });
          currentHeight = tempHeight;
        }

        if (remaining.length > 0) {
          pages.push(currentPageBlocks);
          currentPageBlocks = [];
          currentHeight = 0;
          queue.unshift({ ...block, content: { ...block.content, text: remaining.join('\n') } });
        }
      }

      else if (block.type === 'table') {
        const { rows = 0, cols = 0, data = [] } = block.content;
        let fitsRows = 0;
        let tempHeight = currentHeight;

        for (let r = 0; r < rows; r++) {
          const rowData = data.slice(r * cols, (r + 1) * cols);
          const rowHtml = `<table class="w-full border border-black table-fixed"><tr class="border border-black">${rowData.map(c => `<td class="border border-black px-2 py-1 text-[11pt]">${c}</td>`).join('')}</tr></table>`;
          const h = measureHtml(rowHtml);

          if (tempHeight + h <= CONTENT_MAX_HEIGHT_PX) {
            fitsRows++;
            tempHeight += h;
          } else {
            break;
          }
        }

        if (fitsRows > 0) {
          currentPageBlocks.push({
            ...block,
            content: { ...block.content, rows: fitsRows, data: data.slice(0, fitsRows * cols) }
          });
          currentHeight = tempHeight;
        }

        if (fitsRows < rows) {
          pages.push(currentPageBlocks);
          currentPageBlocks = [];
          currentHeight = 0;
          queue.unshift({
            ...block,
            content: { ...block.content, rows: rows - fitsRows, data: data.slice(fitsRows * cols) }
          });
        }
      }

      else if (block.type === 'image') {
        const h = measureHtml(`<div class="my-4 h-[80mm]"></div>`);
        if (currentHeight + h > CONTENT_MAX_HEIGHT_PX) {
          pages.push(currentPageBlocks);
          currentPageBlocks = [block];
          currentHeight = h;
        } else {
          currentPageBlocks.push(block);
          currentHeight += h;
        }
      }
    }

    if (currentPageBlocks.length > 0) pages.push(currentPageBlocks);

    setPaginatedPages(pages);
    setTocEntries(currentTOC);
    setIsCalculating(false);
  }, [blocks]);

  const titleBlock = blocks.find(b => b.type === "title-page");
  const allImages = blocks.filter(b => b.type === "image");
  const allTables = blocks.filter(b => b.type === "table");

  return (
    <div className="h-full w-full flex flex-col bg-muted/30 relative overflow-hidden" ref={containerRef}>
      
      <div 
        ref={measureRef} 
        className="absolute pointer-events-none" 
        style={{ 
          width: '160mm', 
          ...FONT_STYLE, 
          top: '-9999px', 
          left: '0',
          visibility: 'hidden',
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-word'
        }} 
      />

      <div className="h-10 px-4 py-2 border-b border-border bg-card shrink-0 flex justify-between items-center z-10">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Предпросмотр</span>
        {isCalculating && <span className="text-[10px] animate-pulse text-primary font-medium">Оптимизация страниц...</span>}
      </div>

      <ScrollArea className="flex-1 w-full overflow-hidden">
        <div 
          className="p-8 flex flex-col items-center gap-6 origin-top" 
          style={{ 
            zoom: zoomLevel,
            minHeight: "100%" 
          }}
        >
          {blocks.length === 0 ? (
            <div className={PAGE_STYLE} style={FONT_STYLE}>
              <p className="text-gray-400 italic text-center mt-20">Документ пуст</p>
            </div>
          ) : (
            <>
              {titleBlock && (
                <div className={PAGE_STYLE} style={FONT_STYLE}>
                  <PreviewBlock block={titleBlock} imgNum={0} tabNum={0} projectType={projectType}/>
                </div>
              )}

              <div className={PAGE_STYLE} style={FONT_STYLE}>
                <h2 className="text-[16pt] font-bold text-center mb-8 uppercase">Содержание</h2>
                <div className="space-y-1">
                  {tocEntries.map((entry, i) => (
                    <div key={i} className="flex items-baseline gap-1" style={{ paddingLeft: `${(entry.level - 1) * 1.25}cm` }}>
                      <span className={entry.level === 1 ? "font-bold" : ""}>{entry.text}</span>
                      <span className="flex-1 border-b border-dotted border-gray-400 mx-1 min-w-[1cm] translate-y-[-4px]" />
                      <span className="text-right tabular-nums">{entry.page}</span>
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
                        imgNum={block.type === "image" ? allImages.findIndex(img => img.id === block.id) + 1 : 0}
                        tabNum={block.type === "table" ? allTables.findIndex(tab => tab.id === block.id) + 1 : 0}
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
  return <span className="absolute bottom-[10mm] left-0 right-0 text-center text-[11pt]">{num}</span>;
}

function PreviewBlock({ block, imgNum, tabNum, projectType}: { block: Block; imgNum: number, tabNum: number, projectType: string }) {

  const jobTitleSplit = (title) => {
    return title.split(",");
  }


  const types = {
    "course" : 'КУРСОВАЯ РАБОТА',
    "essay" : 'ЭССЕ',
    "lab" : 'ЛАБОРАТОРНАЯ РАБОТА',
    "diplom" : 'ДИПЛОМНАЯ РАБОТА',
  }

  switch (block.type) {
    case "title-page": {
      const c = block.content;
      return (
        <div className="flex flex-col justify-between h-full text-center py-2">
          <div className="space-y-4">
            <div className="text-[11pt] leading-tight uppercase">
              <p>Министерство образования Республики Беларусь</p>
              <p>УО «{c.university || "БЕЛОРУССКИЙ ГОСУДАРСТВЕННЫЙ ЭКОНОМИЧЕСКИЙ УНИВЕРСИТЕТ"}»</p>
            </div>
            <div className="text-[14pt] mt-8">
              <p>Кафедра <span className="border-b border-black px-4">{c.department || "________________"}</span></p>
            </div>
          </div>
          <div className="space-y-6 flex flex-col items-center">
            <h1 className="text-[18pt] tracking-widest preview">{types[projectType]}</h1>
            <div className="text-[14pt] space-y-2 w-fit">
              <p>по дисциплине: <span className="font-medium w-fit">{c.subject || "..."}</span></p>
              <p>на тему: <span className="font-medium w-fit">{c.title || "..."}</span></p>
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
      const level = block.content.level || 1;
      const Tag = `h${level}` as any;
      const styles = level === 1 
        ? "text-[16pt] font-bold mt-2 mb-4 text-center uppercase break-words preview" 
        : "text-[14pt] font-bold mt-6 mb-3 break-words preview";
      return <Tag className={styles}>{block.content.text}</Tag>;
    }
    case "text":
      return (
        <div className="mb-2 text-justify break-words">
          {(block.content.text || "").split("\n").map((p, i) => (
            <p key={i} className="indent-[1.25cm] leading-[1.5] mb-2">{p}</p>
          ))}
        </div>
      );
    case "image":
      return (
        <div className="my-6 text-center">
          {block.content.url ? (
            <figure className="inline-block">
              <img src={block.content.url} className="max-h-[100mm] max-w-full object-contain mx-auto border" />
              <figcaption className="text-[11pt] italic mt-2">Рисунок {imgNum} — {block.content.caption}</figcaption>
              <figcaption className="text-[11pt] italic mt-2">Примечание — Источник: {block.content.source}</figcaption>
            </figure>
          ) : <div className="p-4 border border-dashed text-muted-foreground">[Изображение]</div>}
        </div>
      );
    case "table": {
      const { rows = 1, cols = 1, data = [] } = block.content;
      return (
        <div className="my-4">
          {block.content ? (
            <figure className="inline-block">
                <figcaption className="text-[11pt] italic mt-2 ">Таблица {tabNum} - {block.content["naming"]}</figcaption>
              <table className="w-full border-collapse border border-black table-fixed text-[11pt]">
                <tbody>
                  {Array.from({ length: rows }).map((_, r) => (
                    <tr key={r}>
                      {Array.from({ length: cols }).map((_, c) => (
                        <td key={c} className="border border-black px-2 py-1 break-words overflow-hidden">
                          {data[r * cols + c] || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
                <figcaption className="text-[11pt] italic mt-2  text-center">{block.content["source"]}</figcaption>
            </figure>
          ): (
            <table className="w-full border-collapse border border-black table-fixed text-[11pt]">
              <tbody>
                {Array.from({ length: rows }).map((_, r) => (
                  <tr key={r}>
                    {Array.from({ length: cols }).map((_, c) => (
                      <td key={c} className="border border-black px-2 py-1 break-words overflow-hidden">
                        {data[r * cols + c] || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      );
    }
    default: return null;
  }
}