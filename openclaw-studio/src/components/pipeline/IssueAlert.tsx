import React from "react";

interface IssueAlertProps {
  issues: string[];
  suggestions: string[];
  autoFixable: boolean;
  onFix?: () => void;
}

export function IssueAlert({ issues, suggestions, autoFixable, onFix }: IssueAlertProps) {
  if (issues.length === 0) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">发现问题</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <ul className="list-disc list-inside space-y-1">
              {issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </div>
          {suggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-yellow-800">建议：</p>
              <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside space-y-1">
                {suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          {autoFixable && onFix && (
            <div className="mt-4">
              <button
                onClick={onFix}
                className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-medium py-2 px-4 rounded text-sm"
              >
                自动修复
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
