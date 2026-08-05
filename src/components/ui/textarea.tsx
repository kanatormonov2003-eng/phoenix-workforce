import * as React from "react";
import { cn } from "@/lib/utils";
export const Textarea=React.forwardRef<HTMLTextAreaElement,React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({className,...props},ref)=><textarea ref={ref} className={cn("w-full rounded-sm border border-line-soft bg-surface-1 px-[13px] py-[11px] text-sm focus:border-ember focus:outline-none",className)} {...props}/>);
Textarea.displayName="Textarea";
