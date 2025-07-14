import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Edit, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";
import { Repository } from "@/../../shared/schema";

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  fileName: string;
  isLoading: boolean;
  selectedRepo: Repository | null;
  originalContent?: string;
}

export default function MarkdownEditor({
  content,
  onChange,
  fileName,
  isLoading,
  selectedRepo,
  originalContent,
}: MarkdownEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasChangesFromOriginal =
    originalContent !== undefined && content !== originalContent;

  const autoSaveMutation = useMutation({
    mutationFn: (data: { repoId: number; filePath: string; content: string }) =>
      apiRequest(
        "PUT",
        `/api/repositories/${data.repoId}/files/${data.filePath}`,
        {
          content: data.content,
        }
      ),
    onSuccess: () => {
      setHasUnsavedChanges(false);
    },
    onError: () => {
      console.error("Auto-save failed");
    },
  });

  const pushToGitHubMutation = useMutation({
    mutationFn: (data: { repoId: number; filePath: string; content: string }) =>
      apiRequest(
        "POST",
        `/api/repositories/${data.repoId}/files/${data.filePath}/push`,
        {
          content: data.content,
        }
      ),
    onSuccess: () => {
      toast({
        title: "Pushed to GitHub",
        description: "Your changes have been synced to GitHub repository.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/repositories", selectedRepo?.id, "files", fileName],
      });
    },
    onError: () => {
      toast({
        title: "Push failed",
        description: "Failed to sync with GitHub. File saved locally only.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!selectedRepo || !fileName || content === originalContent) return;

    setHasUnsavedChanges(true);

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveMutation.mutate({
        repoId: selectedRepo.id,
        filePath: fileName,
        content: content,
      });
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, selectedRepo, fileName, originalContent]);

  const handlePushToGitHub = () => {
    if (!selectedRepo) {
      toast({
        title: "No repository selected",
        description: "Please select a repository first.",
        variant: "destructive",
      });
      return;
    }

    pushToGitHubMutation.mutate({
      repoId: selectedRepo.id,
      filePath: fileName,
      content: content,
    });
  };

  const wordCount = content
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  const charCount = content.length;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col border-r border-github-border">
        <div className="bg-github-light border-b border-github-border px-6 py-3">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-r border-github-border markdown-editor">
      <div className="bg-github-light border-b border-github-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Edit className="h-4 w-4 text-github-gray" />
          {fileName && (
            <span className="font-medium text-github-dark">{fileName}</span>
          )}
          {hasUnsavedChanges && (
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-800"
            >
              Auto-saving...
            </Badge>
          )}
          {hasChangesFromOriginal && !hasUnsavedChanges && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Modified
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-3 text-github-gray text-sm">
            <span>{wordCount} words</span>
            <span>{charCount} chars</span>
          </div>

          <Button
            onClick={handlePushToGitHub}
            disabled={pushToGitHubMutation.isPending || !hasChangesFromOriginal}
            size="sm"
            className={`${
              hasChangesFromOriginal
                ? "bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 shadow-sm"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Upload className="mr-2 h-4 w-4" />
            {pushToGitHubMutation.isPending ? "Pushing..." : "Push to GitHub"}
          </Button>
        </div>
      </div>

      <div className="flex-1 relative">
        {fileName ? (
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Start editing your markdown..."
            className="w-full h-full p-6 font-mono text-sm leading-relaxed resize-none border-none focus:ring-0 focus:outline-none focus:border-none focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{ minHeight: "100%", boxShadow: "none" }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select a markdown file to start editing</p>
          </div>
        )}
      </div>
    </div>
  );
}
