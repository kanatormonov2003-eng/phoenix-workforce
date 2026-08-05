import * as React from "react";
import { cn } from "@/lib/utils";
export function Switch({checked,onCheckedChange,disabled}:{checked?:boolean;onCheckedChange?:(v:boolean)=>void;disabled?:boolean}){return <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={()=>onCheckedChange?.(!checked)} className={cn("relative h-6 w-11 rounded-full transition-colors",checked?"bg-ember":"bg-surface-3",disabled&&"opacity-50")}><span className={cn("absolute top-1 size-4 rounded-full bg-ink transition-transform",checked?"translate-x-6":"translate-x-1")}/></button>}
