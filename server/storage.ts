import { users, repositories, markdownFiles, type User, type InsertUser, type Repository, type InsertRepository, type MarkdownFile, type InsertMarkdownFile } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByGithubId(githubId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserToken(githubId: string, accessToken: string): Promise<User | undefined>;

  // Repository operations
  getRepositoriesByUserId(userId: number): Promise<Repository[]>;
  getRepository(id: number): Promise<Repository | undefined>;
  createRepository(repository: InsertRepository): Promise<Repository>;
  getRepositoryByGithubId(githubId: string, userId: number): Promise<Repository | undefined>;
  deleteRepository(id: number): Promise<void>;

  // File operations
  getMarkdownFilesByRepositoryId(repositoryId: number): Promise<MarkdownFile[]>;
  getMarkdownFile(repositoryId: number, path: string): Promise<MarkdownFile | undefined>;
  createOrUpdateMarkdownFile(file: InsertMarkdownFile): Promise<MarkdownFile>;
  deleteMarkdownFile(repositoryId: number, path: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private repositories: Map<number, Repository>;
  private markdownFiles: Map<number, MarkdownFile>;
  private currentUserId: number;
  private currentRepoId: number;
  private currentFileId: number;

  constructor() {
    this.users = new Map();
    this.repositories = new Map();
    this.markdownFiles = new Map();
    this.currentUserId = 1;
    this.currentRepoId = 1;
    this.currentFileId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByGithubId(githubId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.githubId === githubId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      avatarUrl: insertUser.avatarUrl || null,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserToken(githubId: string, accessToken: string): Promise<User | undefined> {
    const user = await this.getUserByGithubId(githubId);
    if (user) {
      user.accessToken = accessToken;
      this.users.set(user.id, user);
      return user;
    }
    return undefined;
  }

  async getRepositoriesByUserId(userId: number): Promise<Repository[]> {
    return Array.from(this.repositories.values()).filter(repo => repo.userId === userId);
  }

  async getRepository(id: number): Promise<Repository | undefined> {
    return this.repositories.get(id);
  }

  async createRepository(insertRepository: InsertRepository): Promise<Repository> {
    const id = this.currentRepoId++;
    const repository: Repository = { 
      ...insertRepository, 
      id,
      isPrivate: insertRepository.isPrivate || false
    };
    this.repositories.set(id, repository);
    return repository;
  }

  async getRepositoryByGithubId(githubId: string, userId: number): Promise<Repository | undefined> {
    return Array.from(this.repositories.values()).find(
      repo => repo.githubId === githubId && repo.userId === userId
    );
  }

  async getMarkdownFilesByRepositoryId(repositoryId: number): Promise<MarkdownFile[]> {
    return Array.from(this.markdownFiles.values()).filter(file => file.repositoryId === repositoryId);
  }

  async getMarkdownFile(repositoryId: number, path: string): Promise<MarkdownFile | undefined> {
    return Array.from(this.markdownFiles.values()).find(
      file => file.repositoryId === repositoryId && file.path === path
    );
  }

  async createOrUpdateMarkdownFile(insertFile: InsertMarkdownFile): Promise<MarkdownFile> {
    const existing = await this.getMarkdownFile(insertFile.repositoryId, insertFile.path);
    
    if (existing) {
      const updated: MarkdownFile = {
        ...existing,
        content: insertFile.content,
        sha: insertFile.sha,
        lastModified: new Date()
      };
      this.markdownFiles.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentFileId++;
      const file: MarkdownFile = {
        ...insertFile,
        id,
        lastModified: new Date()
      };
      this.markdownFiles.set(id, file);
      return file;
    }
  }

  async deleteMarkdownFile(repositoryId: number, path: string): Promise<void> {
    const file = await this.getMarkdownFile(repositoryId, path);
    if (file) {
      this.markdownFiles.delete(file.id);
    }
  }

  async deleteRepository(id: number): Promise<void> {
    // Delete the repository
    this.repositories.delete(id);
    
    // Delete all associated markdown files
    const filesToDelete = [];
    for (const [fileId, file] of this.markdownFiles.entries()) {
      if (file.repositoryId === id) {
        filesToDelete.push(fileId);
      }
    }
    
    for (const fileId of filesToDelete) {
      this.markdownFiles.delete(fileId);
    }
  }
}

export const storage = new MemStorage();
