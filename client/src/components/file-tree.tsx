import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Repository, GitHubFile } from "@/../../shared/schema";

interface FileTreeProps {
  repositories: Repository[];
  selectedRepo: Repository | null;
  onRepoSelect: (repo: Repository) => void;
  selectedFile: string;
  onFileSelect: (file: string) => void;
  isLoading: boolean;
  onRefreshRepositories: () => void;
}

export default function FileTree({
  repositories,
  selectedRepo,
  onRepoSelect,
  selectedFile,
  onFileSelect,
  isLoading,
  onRefreshRepositories,
}: FileTreeProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: files,
    isLoading: filesLoading,
    refetch: refetchFiles,
  } = useQuery<GitHubFile[]>({
    queryKey: ["/api/repositories", selectedRepo?.id, "files"],
    enabled: !!selectedRepo && !!selectedRepo.id,
  });

  const filteredFiles =
    files?.filter((file: GitHubFile) =>
      file.path.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  if (isLoading) {
    return (
      <div className="w-80 bg-github-sidebar text-white border-r border-github-border flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <Skeleton className="h-10 w-full bg-gray-700 mb-3" />
          <Skeleton className="h-10 w-full bg-gray-700" />
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full bg-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-github-sidebar text-white border-r border-github-border flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Repository
          </label>
          <Select
            value={selectedRepo?.id?.toString()}
            onValueChange={(value) => {
              const repo = repositories.find((r) => r.id.toString() === value);
              if (repo) onRepoSelect(repo);
            }}
          >
            <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select repository" />
            </SelectTrigger>
            <SelectContent>
              {repositories.map((repo) => (
                <SelectItem key={repo.id} value={repo.id.toString()}>
                  {repo.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          <Input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-700 border-gray-600 text-white pl-9"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
              Markdown Files
            </div>
            <Button
              onClick={() => {
                onRefreshRepositories();
                if (selectedRepo?.id) {
                  refetchFiles();
                }
              }}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-300 hover:text-white hover:bg-gray-600 border border-gray-600"
              disabled={filesLoading}
            >
              <RefreshCw
                className={`h-3 w-3 ${filesLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {filesLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-gray-700" />
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No markdown files found</p>
            </div>
          ) : (
            filteredFiles.map((file: GitHubFile) => (
              <div
                key={file.path}
                onClick={() => onFileSelect(file.path)}
                className={`cursor-pointer px-3 py-2 rounded-lg transition-colors duration-150 border ${
                  selectedFile === file.path
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700 hover:border-gray-500 hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText
                    className={`h-4 w-4 ${
                      selectedFile === file.path
                        ? "text-blue-200"
                        : "text-blue-400"
                    }`}
                  />
                  <span className="text-sm truncate">{file.path}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{filteredFiles.length} markdown files</span>
        </div>
      </div>
    </div>
  );
}
