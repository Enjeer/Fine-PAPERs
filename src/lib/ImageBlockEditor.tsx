import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { UploadCloud, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageBlockEditorProps {
    content: {
        url?: string;
        caption?: string;
        source?: string;
        file?: File;
    };
    isSaved?: boolean;
    onChange: (content: any) => void;
}

export default function ImageBlockEditor({ content, onChange, isSaved }: ImageBlockEditorProps) {
    const { url, caption, source, file } = content;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const localUrl = URL.createObjectURL(selectedFile);
            onChange({ ...content, url: localUrl, file: selectedFile });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.type.startsWith("image/")) {
            const localUrl = URL.createObjectURL(droppedFile);
            onChange({ ...content, url: localUrl, file: droppedFile });
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const removeImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange({ ...content, url: "", file: undefined });
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="space-y-3">
            {/* Hidden native input - остается чистым */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg"
                className="hidden"
            />

            {/* Контейнер для перетаскивания (Drop Zone) */}
            <div
                onClick={triggerFileInput}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "relative group flex flex-col items-center justify-center w-full min-h-[160px] rounded-lg border-2 border-dashed transition-all cursor-pointer overflow-hidden",
                    !url
                        ? "border-muted-foreground/25 bg-muted/5 hover:border-primary/50 hover:bg-primary/5"
                        : "border-transparent bg-background",
                    isDragging && "border-primary bg-primary/10 ring-2 ring-primary/20"
                )}
            >
                {url ? (
                    <>
                        <img
                            src={url}
                            alt="Preview"
                            className={cn(
                                "w-full max-h-[300px] object-contain rounded-md transition-all",
                                (file && !isSaved) && "opacity-60 grayscale-[0.5]"
                            )}
                        />

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <RefreshCw className="w-8 h-8 text-white mb-2" />
                            <span className="text-white text-xs font-medium">Нажмите или перетащите, чтобы заменить</span>
                        </div>

                        {/* Delete button */}
                        {!isSaved && (
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={removeImage}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}

                        {(file && !isSaved) && (
                            <div className="absolute bottom-2 left-2 pointer-events-none">
                                <span className="text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground px-2 py-1 rounded shadow-sm">
                                    Ожидает сохранения...
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center p-6 text-center">
                        <div className="p-4 rounded-full bg-primary/10 mb-3 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Загрузить изображение</p>
                        <p className="text-xs text-muted-foreground mt-1">Перетащите файл или нажмите для выбора (PNG, JPG до 5MB)</p>
                    </div>
                )}
            </div>

            <Input
                value={caption || ""}
                onChange={(e) => onChange({ ...content, caption: e.target.value })}
                placeholder="Добавить подпись к рисунку..."
                className="text-sm italic border-none bg-muted/30 focus-visible:ring-1"
            />
            <Input
                value={source || ""}
                onChange={(e) => onChange({ ...content, caption: e.target.value })}
                placeholder="Источник..."
                className="text-sm italic border-none bg-muted/30 focus-visible:ring-1"
            />
        </div>
    );
}