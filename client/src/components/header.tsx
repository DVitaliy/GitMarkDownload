import { Button } from "@/components/ui/button";
import { Github, GitBranch, LogOut } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Repository } from "@/../../shared/schema";

interface HeaderProps {
  user: User;
  currentRepo: Repository | null;
}

export default function Header({ user, currentRepo }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();

      document.cookie.split(";").forEach(function (c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      window.location.href = "/auth?force_logout=" + Date.now();
    },
  });



  return (
    <header className="bg-white border-b border-github-border px-6 py-3 flex items-center justify-between h-16">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <img 
            src="/logo.png" 
            alt="GitMarkDownload Logo" 
            className="h-8 w-8"
          />
          <span className="text-xl font-bold text-github-dark">GitMarkDownload</span>
        </div>
        
        {currentRepo && (
          <div className="hidden md:flex items-center space-x-2 text-github-gray">
            <GitBranch className="h-4 w-4" />
            <span className="text-sm">{currentRepo.fullName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center space-x-2 text-github-gray">
          <img
            src={user.avatarUrl ?? undefined}
            alt="User avatar"
            className="w-6 h-6 rounded-full"
          />
          <span className="text-sm font-medium">{user.username}</span>
        </div>



        <Button
          onClick={() => logoutMutation.mutate()}
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300"
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
