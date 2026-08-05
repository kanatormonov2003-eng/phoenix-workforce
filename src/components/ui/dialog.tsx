import * as React from "react";
export function Dialog({open,onOpenChange,children}:{open:boolean;onOpenChange:(v:boolean)=>void;children:React.ReactNode}){return <>{open?children:null}</>}
export function DialogContent({children,className=""}:{children:React.ReactNode;className?:string}){return <div className={"fixed inset-0 z-[80] m-auto h-fit max-h-[90vh] w-[min(560px,calc(100vw-32px))] overflow-auto rounded-lg border bg-surface-1 p-5 shadow-2xl "+className}>{children}</div>}
export const DialogHeader=({children}:{children:React.ReactNode})=><div className="mb-4">{children}</div>;
export const DialogTitle=({children}:{children:React.ReactNode})=><h2 className="text-lg font-semibold">{children}</h2>;
export const DialogDescription=({children,className=""}:{children:React.ReactNode;className?:string})=><p className={"text-sm "+className}>{children}</p>;
export const DialogFooter=({children}:{children:React.ReactNode})=><div className="mt-5 flex justify-end gap-2">{children}</div>;
