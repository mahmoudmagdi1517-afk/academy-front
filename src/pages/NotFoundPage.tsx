import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl mb-4">
        <AlertCircle className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">404</h1>
      <p className="text-base text-slate-600 font-medium mt-2">Page Not Found</p>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">
        The page you are looking for does not exist or you do not have permission to view it.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md transition"
      >
        <Home className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
};
