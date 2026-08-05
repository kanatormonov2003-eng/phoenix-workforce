import React from "react";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "default" | "lg";
  asChild?: boolean;
}

export function Button({ 
  children, 
  className = "", 
  asChild,
  ...props 
}: Props) {
  return (
    <button
      className={`rounded-lg bg-orange-500 px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}