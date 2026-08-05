import * as React from "react";
export function AlertDialog({open,onOpenChange,children}:{open:boolean;onOpenChange:(v:boolean)=>void;children:React.ReactNode}){return <>{open?<div className="fixed inset-0 z-[80] grid place-items-center bg-bg-deep/70 p-4">{children}</div>:null}</>}
export const AlertDialogContent=({children,className=""}:{children:React.ReactNode;className?:string})=><div className={"w-full max-w-lg rounded-lg border p-5 "+className}>{children}</div>;
export const AlertDialogHeader=({children}:{children:React.ReactNode})=><div className="mb-4">{children}</div>;
export const AlertDialogTitle=({children}:{children:React.ReactNode})=><h2 className="text-lg font-semibold">{children}</h2>;
export const AlertDialogDescription=({children,className=""}:{children:React.ReactNode;className?:string})=><p className={"text-sm "+className}>{children}</p>;
export const AlertDialogFooter=({children}:{children:React.ReactNode})=><div className="mt-5 flex justify-end gap-2">{children}</div>;
export const AlertDialogCancel=({children,disabled,onClick}:{children:React.ReactNode;disabled?:boolean;onClick?:()=>void})=><button type="button" disabled={disabled} onClick={onClick} className="rounded-sm border px-4 py-2 text-sm">{children}</button>;
export const AlertDialogAction=({children,disabled,onClick,className=""}:{children:React.ReactNode;disabled?:boolean;onClick?:()=>void;className?:string})=><button type="button" disabled={disabled} onClick={onClick} className={"rounded-sm bg-ember px-4 py-2 text-sm "+className}>{children}</button>;
