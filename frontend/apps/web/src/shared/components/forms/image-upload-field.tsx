"use client"
import { useState } from "react"
import { FileDropzone } from "../file-upload/file-dropzone"
export function ImageUploadField({ label, onFiles, maxSize = 5_000_000 }: { label: string; onFiles: (files: File[]) => void; maxSize?: number }) { const [selected, setSelected] = useState<File>(); return <div className="space-y-2"><p className="text-sm font-medium">{label}</p><FileDropzone maxSize={maxSize} onFiles={(files) => { setSelected(files[0]); onFiles(files) }} accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] }} />{selected && <p role="status" className="text-muted-foreground text-xs">تم اختيار {selected.name} · {(selected.size / 1_000_000).toFixed(1)} ميجابايت</p>}</div> }
