import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";

export default function Home() {
  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <p className="text-sm text-gray-500 mt-1">Select a project to start surveying</p>
      </header>

      {/* Projects list - will be populated from database */}
      <div className="space-y-3">
        {/* Empty state */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700">No projects yet</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Create your first project to get started
          </p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            <Plus size={20} />
            New Project
          </Link>
        </div>
      </div>

      {/* FAB for new project */}
      <Link
        href="/projects/new"
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
        aria-label="New project"
      >
        <Plus size={28} />
      </Link>
    </div>
  );
}
