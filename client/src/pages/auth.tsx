import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Github, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Auth() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authError = urlParams.get("error");

    if (authError === "access_denied") {
      setError(
        "Authorization was cancelled. Please try again to access your repositories."
      );
    } else if (authError === "no_code") {
      setError("Authorization failed. Please try again.");
    } else if (authError) {
      setError("Authorization error occurred. Please try again.");
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  const handleGithubLogin = () => {
    setError(null);

    const urlParams = new URLSearchParams(window.location.search);
    const forceLogout = urlParams.get("force_logout");

    if (forceLogout) {
      window.location.href = `/api/auth/github?force_logout=${forceLogout}`;
    } else {
      window.location.href = "/api/auth/github";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-github-light">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-github-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-github-light">
      <Card className="w-full max-w-md mx-4 border-2 border-gray-300 shadow-xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo.png"
              alt="md2pdf.download Logo"
              className="h-28 w-28"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-github-dark">
            MD2PDF.Download
          </CardTitle>
          <CardDescription>
            Edit GitHub repository Markdown files with real-time preview
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGithubLogin}
            className="w-full bg-gray-700 hover:bg-black text-white border-2 border-gray-600 shadow-lg font-semibold"
            size="lg"
          >
            <Github className="mr-2 h-5 w-5" />
            Sign in with GitHub
          </Button>

          <div className="mt-6 text-center text-sm text-github-gray">
            <p>
              We need access to your GitHub repositories to load and edit
              Markdown files.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
