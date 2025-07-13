import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Header from "@/components/header";
import FileTree from "@/components/file-tree";
import MarkdownEditor from "@/components/markdown-editor";
import MarkdownPreview from "@/components/markdown-preview";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Repository,
  User,
  MarkdownFile,
  GitHubFile,
} from "@/../../shared/schema";

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>("README.md");
  const [markdownContent, setMarkdownContent] = useState<string>("");

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  const {
    data: repositories,
    isLoading: reposLoading,
    refetch: refetchRepositories,
  } = useQuery<Repository[]>({
    queryKey: ["/api/repositories"],
    enabled: !!user,
  });

  const { data: markdownFiles } = useQuery<GitHubFile[]>({
    queryKey: ["/api/repositories", selectedRepo?.id, "files"],
    enabled: !!selectedRepo && !!selectedRepo.id,
  });

  const { data: fileContent, isLoading: fileLoading } = useQuery<MarkdownFile>({
    queryKey: ["/api/repositories", selectedRepo?.id, "files", selectedFile],
    enabled: !!selectedRepo && !!selectedRepo.id && !!selectedFile,
  });

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      setLocation("/auth");
      return;
    }
  }, [user, userLoading, setLocation]);

  useEffect(() => {
    if (repositories && repositories.length > 0 && !selectedRepo) {
      setSelectedRepo(repositories[0]);
    } else if (repositories && repositories.length === 0 && selectedRepo) {
      setSelectedRepo(null);
      setSelectedFile("");
      setMarkdownContent("");
    }
  }, [repositories, selectedRepo]);

  useEffect(() => {
    if (markdownFiles && markdownFiles.length === 0) {
      setSelectedFile("");
      setMarkdownContent("");
    } else if (
      markdownFiles &&
      markdownFiles.length > 0 &&
      !markdownFiles.find((f: GitHubFile) => f.path === selectedFile)
    ) {
      setSelectedFile(markdownFiles[0].path);
    }
  }, [markdownFiles, selectedFile]);

  useEffect(() => {
    if (fileContent) {
      setMarkdownContent(fileContent.content);
    }
  }, [fileContent]);

  if (userLoading || !user) {
    return (
      <div className="h-screen flex flex-col">
        <div className="h-16 border-b border-github-border px-6 py-3 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex-1 flex">
          <PanelGroup direction="horizontal">
            <Panel defaultSize={25} minSize={15} maxSize={40}>
              <div className="h-full bg-github-sidebar border-r border-github-border p-4">
                <Skeleton className="h-full w-full bg-gray-700" />
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-github-border" />

            <Panel defaultSize={37.5} minSize={20}>
              <div className="h-full border-r border-github-border">
                <Skeleton className="h-full w-full" />
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-github-border" />

            <Panel defaultSize={37.5} minSize={20}>
              <div className="h-full">
                <Skeleton className="h-full w-full" />
              </div>
            </Panel>
          </PanelGroup>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white text-github-dark overflow-hidden">
      <Header user={user} currentRepo={selectedRepo} />

      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" className="h-full">
          <Panel defaultSize={25} minSize={15} maxSize={40}>
            <FileTree
              repositories={repositories || []}
              selectedRepo={selectedRepo}
              onRepoSelect={setSelectedRepo}
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              isLoading={reposLoading}
              onRefreshRepositories={refetchRepositories}
            />
          </Panel>

          <PanelResizeHandle className="w-2 bg-github-border hover:bg-blue-500 transition-colors duration-200 cursor-col-resize" />

          <Panel defaultSize={37.5} minSize={20}>
            <MarkdownEditor
              content={markdownContent}
              onChange={setMarkdownContent}
              fileName={selectedFile}
              isLoading={fileLoading}
              selectedRepo={selectedRepo}
              originalContent={fileContent?.content}
            />
          </Panel>

          <PanelResizeHandle className="w-2 bg-github-border hover:bg-blue-500 transition-colors duration-200 cursor-col-resize" />

          <Panel defaultSize={37.5} minSize={20}>
            <MarkdownPreview
              content={markdownContent}
              currentRepo={selectedRepo}
            />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
