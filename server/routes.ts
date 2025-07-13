import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertRepositorySchema,
  insertMarkdownFileSchema,
} from "@shared/schema";
import { z } from "zod";

// Extend session data
declare module "express-session" {
  interface SessionData {
    userId?: number;
    accessToken?: string;
  }
}

const GITHUB_CLIENT_ID =
  process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";

export async function registerRoutes(app: Express): Promise<Server> {
  // GitHub OAuth routes
  app.get("/api/auth/github", (req, res) => {
    console.log(`[OAuth] Starting GitHub OAuth flow`);
    console.log(`[OAuth] Request headers host: ${req.get("host")}`);
    console.log(`[OAuth] Request protocol: ${req.protocol}`);
    console.log(`[OAuth] REPLIT_DOMAINS env: ${process.env.REPLIT_DOMAINS}`);

    // Determine the correct host for Replit environment
    let host = req.get("host");
    let protocol = req.protocol;

    // If we're in a Replit environment, use the Replit domain
    if (process.env.REPLIT_DOMAINS) {
      host = process.env.REPLIT_DOMAINS;
      protocol = "https";
      console.log(`[OAuth] Using Replit domain: ${host}`);
    }

    const redirectUri = `${protocol}://${host}/api/auth/github/callback`;

    console.log(`[OAuth] Final redirect URI: ${redirectUri}`);
    console.log(
      `[OAuth] GitHub Client ID: ${GITHUB_CLIENT_ID ? "Present" : "Missing"}`,
    );

    // Generate random state and add timestamp to force fresh authorization
    const state = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now();

    // Check if this is a forced logout (from query params)
    const isForceLogout = req.query.force_logout;

    // For forced logout, add parameters that might trigger re-authorization
    let githubAuthUrl;
    if (isForceLogout) {
      // Try different scope order or additional parameters to force re-auth
      githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user:email,repo&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&t=${timestamp}&allow_signup=false`;
    } else {
      githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo,user:email&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    }

    console.log(`[OAuth] Force logout: ${!!isForceLogout}`);
    console.log(`[OAuth] Redirecting to: ${githubAuthUrl}`);

    res.redirect(githubAuthUrl);
  });

  app.get("/api/auth/github/callback", async (req, res) => {
    console.log(`[OAuth Callback] Received callback from GitHub`);
    console.log(`[OAuth Callback] Query params:`, req.query);

    const { code, error, error_description } = req.query;

    // Handle authorization errors (user denied access)
    if (error) {
      console.log(
        `[OAuth Callback] Authorization error: ${error} - ${error_description}`,
      );
      return res.redirect("/auth?error=access_denied");
    }

    if (!code) {
      console.log(`[OAuth Callback] No authorization code provided`);
      return res.redirect("/auth?error=no_code");
    }

    console.log(`[OAuth Callback] Authorization code received: ${code}`);

    try {
      // Exchange code for access token
      const tokenResponse = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code,
          }),
        },
      );

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(
          tokenData.error_description || "Failed to get access token",
        );
      }

      const accessToken = tokenData.access_token;

      // Get user info from GitHub
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${accessToken}`,
          "User-Agent": "GitMarkdown-App",
        },
      });

      const userData = await userResponse.json();

      // Create or update user in storage
      let user = await storage.getUserByGithubId(userData.id.toString());

      if (user) {
        user = await storage.updateUserToken(
          userData.id.toString(),
          accessToken,
        );
      } else {
        user = await storage.createUser({
          githubId: userData.id.toString(),
          username: userData.login,
          accessToken,
          avatarUrl: userData.avatar_url,
        });
      }

      // Store user info in session
      if (req.session) {
        req.session.userId = user?.id;
        req.session.accessToken = accessToken;
      }

      res.redirect("/?auth=success");
    } catch (error) {
      console.error("OAuth error:", error);
      res.redirect("/?auth=error");
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = req.session?.userId
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });
  });

  app.post("/api/auth/logout", async (req, res) => {
    const accessToken = req.session?.accessToken;

    try {
      // Revoke GitHub access token if it exists
      if (accessToken) {
        console.log(`[Logout] Revoking GitHub access token`);

        // First revoke the specific token
        const revokeTokenResponse = await fetch(
          `https://api.github.com/applications/${GITHUB_CLIENT_ID}/token`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Basic ${Buffer.from(`${GITHUB_CLIENT_ID}:${GITHUB_CLIENT_SECRET}`).toString("base64")}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              access_token: accessToken,
            }),
          },
        );

        console.log(
          `[Logout] Token revocation status: ${revokeTokenResponse.status}`,
        );

        // Also try to revoke all grants for the application (force re-authorization)
        const revokeGrantResponse = await fetch(
          `https://api.github.com/applications/${GITHUB_CLIENT_ID}/grant`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Basic ${Buffer.from(`${GITHUB_CLIENT_ID}:${GITHUB_CLIENT_SECRET}`).toString("base64")}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              access_token: accessToken,
            }),
          },
        );

        console.log(
          `[Logout] Grant revocation status: ${revokeGrantResponse.status}`,
        );

        const revokeResponse = revokeTokenResponse;

        if (revokeResponse.ok) {
          console.log(`[Logout] GitHub token revoked successfully`);
        } else {
          console.log(
            `[Logout] Failed to revoke GitHub token: ${revokeResponse.status} ${revokeResponse.statusText}`,
          );
        }
      }
    } catch (error) {
      console.error(`[Logout] Error revoking token:`, error);
      // Continue with logout even if token revocation fails
    }

    // Destroy session
    req.session.destroy((err: Error | null) => {
      if (err) {
        console.error(`[Logout] Session destruction error:`, err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      console.log(`[Logout] Session destroyed successfully`);
      res.json({ message: "Logged out successfully" });
    });
  });

  // Repository routes
  app.get("/api/repositories", async (req, res) => {
    const userId = req.session?.userId;
    const accessToken = req.session?.accessToken;

    if (!userId || !accessToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Fetch repositories from GitHub API
      const response = await fetch(
        "https://api.github.com/user/repos?sort=updated&per_page=100",
        {
          headers: {
            Authorization: `token ${accessToken}`,
            "User-Agent": "GitMarkdown-App",
          },
        },
      );

      const repos = await response.json();

      // Get current local repositories for this user
      const currentLocalRepos = await storage.getRepositoriesByUserId(userId);
      const githubRepoIds = new Set(
        repos.map((repo: { id: number }) => repo.id.toString()),
      );

      // Remove repositories that no longer exist on GitHub
      for (const localRepo of currentLocalRepos) {4
        if (!githubRepoIds.has(localRepo.githubId)) {
          console.log(
            `[Sync] Removing deleted repository: ${localRepo.fullName}`,
          );
          await storage.deleteRepository(localRepo.id);
        }
      }

      // Store/update repositories in local storage and return only existing ones
      const savedRepos = [];
      for (const repo of repos) {
        let existingRepo = await storage.getRepositoryByGithubId(
          repo.id.toString(),
          userId,
        );

        if (!existingRepo) {
          existingRepo = await storage.createRepository({
            githubId: repo.id.toString(),
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner.login,
            isPrivate: repo.private,
            userId,
          });
        }
        savedRepos.push(existingRepo);
      }

      res.json(savedRepos);
    } catch (error) {
      console.error("Repository fetch error:", error);
      res.status(500).json({ message: "Failed to fetch repositories" });
    }
  });

  // File routes
  // Handle case when no repository is selected (return empty array)
  app.get("/api/repositories/files", async (req, res) => {
    res.json([]);
  });

  app.get("/api/repositories/:repoId/files", async (req, res) => {
    const userId = req.session?.userId;
    const accessToken = req.session?.accessToken;
    const { repoId } = req.params;

    if (!userId || !accessToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const repository = await storage.getRepository(parseInt(repoId));

      if (!repository || repository.userId !== userId) {
        return res.status(404).json({ message: "Repository not found" });
      }

      // Fetch repository content from GitHub API
      const response = await fetch(
        `https://api.github.com/repos/${repository.fullName}/git/trees/main?recursive=1`,
        {
          headers: {
            Authorization: `token ${accessToken}`,
            "User-Agent": "GitMarkdown-App",
          },
        },
      );

      const data = await response.json();

      // Filter for markdown files
      const markdownFiles =
        data.tree?.filter(
          (file: { type: string; path: string }) =>
            file.type === "blob" && file.path.endsWith(".md"),
        ) || [];

      res.json(markdownFiles);
    } catch (error) {
      console.error("Files fetch error:", error);
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.get("/api/repositories/:repoId/files/:filePath(*)", async (req, res) => {
    const userId = req.session?.userId;
    const accessToken = req.session?.accessToken;
    const { repoId, filePath } = req.params;

    if (!userId || !accessToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const repository = await storage.getRepository(parseInt(repoId));

      if (!repository || repository.userId !== userId) {
        return res.status(404).json({ message: "Repository not found" });
      }

      // Check local storage first
      let file = await storage.getMarkdownFile(parseInt(repoId), filePath);

      if (!file) {
        // Fetch from GitHub API
        const response = await fetch(
          `https://api.github.com/repos/${repository.fullName}/contents/${filePath}`,
          {
            headers: {
              Authorization: `token ${accessToken}`,
              "User-Agent": "GitMarkdown-App",
            },
          },
        );

        if (!response.ok) {
          return res.status(404).json({ message: "File not found on GitHub" });
        }

        const data = await response.json();

        if (!data.content) {
          return res
            .status(400)
            .json({ message: "File content not available" });
        }

        const content = Buffer.from(data.content, "base64").toString("utf-8");
        console.log(
          `[File Content] Decoded content for ${filePath}:`,
          content.substring(0, 100) + (content.length > 100 ? "..." : ""),
        );

        // Store in local storage
        file = await storage.createOrUpdateMarkdownFile({
          repositoryId: parseInt(repoId),
          path: filePath,
          content,
          sha: data.sha,
        });
      }

      res.json(file);
    } catch (error) {
      console.error("File fetch error:", error);
      res.status(500).json({ message: "Failed to fetch file" });
    }
  });

  app.put("/api/repositories/:repoId/files/:filePath(*)", async (req, res) => {
    const userId = req.session?.userId;
    const { repoId, filePath } = req.params;
    const { content } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const repository = await storage.getRepository(parseInt(repoId));

      if (!repository || repository.userId !== userId) {
        return res.status(404).json({ message: "Repository not found" });
      }

      // Get access token for potential GitHub update
      const accessToken = req.session?.accessToken;

      // Update in local storage
      const file = await storage.createOrUpdateMarkdownFile({
        repositoryId: parseInt(repoId),
        path: filePath,
        content,
        sha: "local", // Local changes - not pushed to GitHub
      });

      console.log(
        `[File Save] Successfully saved ${filePath} locally. Content length: ${content.length}`,
      );

      res.json({
        ...file,
        message: "File saved locally (not synced to GitHub)",
      });
    } catch (error) {
      console.error("File update error:", error);
      res.status(500).json({ message: "Failed to update file" });
    }
  });

  // Push changes to GitHub
  app.post(
    "/api/repositories/:repoId/files/:filePath(*)/push",
    async (req, res) => {
      const userId = req.session?.userId;
      const accessToken = req.session?.accessToken;
      const { repoId, filePath } = req.params;
      const { content } = req.body;

      if (!userId || !accessToken) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      try {
        const repository = await storage.getRepository(parseInt(repoId));

        if (!repository || repository.userId !== userId) {
          return res.status(404).json({ message: "Repository not found" });
        }

        // Get current file SHA from GitHub
        const getResponse = await fetch(
          `https://api.github.com/repos/${repository.fullName}/contents/${filePath}`,
          {
            headers: {
              Authorization: `token ${accessToken}`,
              "User-Agent": "GitMarkdown-App",
            },
          },
        );

        let sha = null;
        if (getResponse.ok) {
          const currentFile = await getResponse.json();
          sha = currentFile.sha;
        }

        // Prepare the update payload
        const updatePayload = {
          message: `Update ${filePath} via GitMarkDownload`,
          content: Buffer.from(content).toString("base64"),
          ...(sha && { sha }), // Include SHA if file exists
        };

        // Push to GitHub
        const updateResponse = await fetch(
          `https://api.github.com/repos/${repository.fullName}/contents/${filePath}`,
          {
            method: "PUT",
            headers: {
              Authorization: `token ${accessToken}`,
              "User-Agent": "GitMarkdown-App",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatePayload),
          },
        );

        if (!updateResponse.ok) {
          const error = await updateResponse.json();
          console.error("GitHub update error:", error);
          return res
            .status(400)
            .json({
              message: "Failed to push to GitHub",
              error: error.message,
            });
        }

        const result = await updateResponse.json();

        // Update local storage with new SHA
        await storage.createOrUpdateMarkdownFile({
          repositoryId: parseInt(repoId),
          path: filePath,
          content,
          sha: result.content.sha,
        });

        console.log(`[GitHub Push] Successfully pushed ${filePath} to GitHub`);

        res.json({
          message: "Successfully pushed to GitHub",
          sha: result.content.sha,
        });
      } catch (error) {
        console.error("GitHub push error:", error);
        res.status(500).json({ message: "Failed to push to GitHub" });
      }
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}
