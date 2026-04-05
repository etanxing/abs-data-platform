import React from "react";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
  label?: string;
}

export function SearchInput({
  onSearch,
  label,
  className = "",
  ...props
}: SearchInputProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && onSearch) {
      onSearch((e.target as HTMLInputElement).value);
    }
  }

  return (
    <div className="w-full">
      {label ? (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          onKeyDown={handleKeyDown}
          className={[
            "block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg",
            "text-gray-900 placeholder-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
            "transition-colors duration-150",
            className,
          ].join(" ")}
          {...props}
        />
      </div>
    </div>
  );
}
