import React from "react";

export function Table({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className={`w-full ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function THead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <thead className="border-b border-gray-800">
      {children}
    </thead>
  );
}

export function TH({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-4 py-3 text-left text-sm font-medium">
      {children}
    </th>
  );
}

export function TR({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <tr className="border-b border-gray-800">
      {children}
    </tr>
  );
}

export function TD({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td className="px-4 py-3 text-sm">
      {children}
    </td>
  );
}