import Link from "next/link";
import { FolderOpen, Plus, ChevronRight, BarChart3, CheckCircle, AlertCircle, Clock, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";

export const dynamic = 'force-dynamic';

async function getProjects() {
  try {
    const projects = await prisma.projects.findMany({
      orderBy: { updated_at: 'desc' },
      include: {
        _count: {
          select: { line_items: true, zones: true },
        },
      },
    });

    // Get stats for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        // Get actual line item counts by status
        const lineItems = await prisma.line_items.findMany({
          where: { project_id: project.id },
          select: { status: true }
        });

        const stats = {
          matched: lineItems.filter(item => item.status === 'PASS2_COMPLETE').length,
          pending: lineItems.filter(item => 
            item.status === 'PENDING_PASS1' || 
            item.status === 'PENDING_PASS2' || 
            item.status === 'PENDING_QS_REVIEW'
          ).length,
          failed: lineItems.filter(item => item.status && item.status.toString() === 'PASS2_ERROR').length,
          lineItems: lineItems.length
        };

        console.log(`[DEBUG] Home page stats for ${project.id}: matched=${stats.matched}, pending=${stats.pending}, failed=${stats.failed}, total=${stats.lineItems}`);

        return {
          ...project,
          _stats: stats
        };
      })
    );

    return projectsWithStats;
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    // Return empty array when database is down
    return [];
  }
}

async function deleteProject(projectId: string) {
  try {
    // First, delete all related data in the correct order
    await prisma.audit_entries.deleteMany({
      where: {
        line_items: {
          project_id: projectId
        }
      }
    });

    await prisma.spons_matches.deleteMany({
      where: {
        line_items: {
          project_id: projectId
        }
      }
    });

    await prisma.line_items.deleteMany({
      where: { project_id: projectId }
    });

    // Note: captures table doesn't have project_id, so we need to handle this differently
    // For now, just delete zones and project
    await prisma.zones.deleteMany({
      where: { project_id: projectId }
    });

    // Delete any Supabase storage files for this project
    // This would need to be implemented based on your Supabase setup
    // For now, just delete the project record
    await prisma.projects.delete({
      where: { id: projectId }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to delete project:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export default async function Home() {
  const projects = await getProjects();

  // Calculate total stats
  const totalStats = projects.reduce((acc, project) => ({
    projects: projects.length,
    lineItems: acc.lineItems + (project._count?.line_items || 0),
    matched: acc.matched + (project._stats?.matched || 0),
    pending: acc.pending + (project._stats?.pending || 0),
    failed: acc.failed + (project._stats?.failed || 0),
  }), { projects: 0, lineItems: 0, matched: 0, pending: 0, failed: 0 });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SPONS Mobile</h1>
              <p className="text-gray-600 mt-1">Agentic Inspection Platform</p>
            </div>
            <Link
              href="/projects/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              New Project
            </Link>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Projects</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.projects}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BarChart3 size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Items</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.lineItems}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Matched</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.matched}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.pending}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.failed}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Welcome to SPONS Mobile</h2>
          <p className="text-blue-100 mb-4">
            Your agentic inspection platform for capturing, processing, and exporting SPONS-ready line items.
            Walk sites, record observations, and let AI handle the rest.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <h3 className="font-semibold mb-1">🎤 Record</h3>
              <p className="text-sm text-blue-100">Capture voice observations with mobile-first interface</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <h3 className="font-semibold mb-1">🧠 Process</h3>
              <p className="text-sm text-blue-100">AI automatically splits, matches, and categorizes items</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <h3 className="font-semibold mb-1">📊 Export</h3>
              <p className="text-sm text-blue-100">Generate SPONS-ready spreadsheets with confidence scores</p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
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
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
                      {project.client && (
                        <p className="text-sm text-gray-600 mt-1">{project.client}</p>
                      )}
                      {project.site_address && (
                        <p className="text-sm text-gray-500 mt-1 truncate">{project.site_address}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Link
                        href={`/projects/${project.id}/capture`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Open project"
                      >
                        <BarChart3 size={16} />
                      </Link>
                      <DeleteProjectButton 
                        projectId={project.id} 
                        projectName={project.name} 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <p className="font-medium text-gray-900">{project._count?.line_items || 0}</p>
                      <p className="text-gray-500">Items</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900">{project._count?.zones || 0}</p>
                      <p className="text-gray-500">Zones</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900">{project._stats?.matched || 0}</p>
                      <p className="text-gray-500">Matched</p>
                    </div>
                  </div>
                </div>
                
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <Link
                    href={`/projects/${project.id}/capture`}
                    className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center block"
                  >
                    Open Project
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {projects.length === 0 && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
                <AlertCircle size={48} className="text-amber-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Database Connection Issues</h3>
                <p className="text-gray-600 mb-4">
                  The app is having trouble connecting to the database. You can still create new projects and record items, which will be saved locally and sync when the connection is restored.
                </p>
                <div className="text-sm text-gray-500">
                  <p>• Recording works offline</p>
                  <p>• Data will sync automatically</p>
                  <p>• Check connection status above</p>
                </div>
              </div>
              
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus size={20} />
                Create New Project
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
