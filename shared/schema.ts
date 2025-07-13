import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  githubId: text("github_id").notNull().unique(),
  username: text("username").notNull(),
  accessToken: text("access_token").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  githubId: text("github_id").notNull(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  owner: text("owner").notNull(),
  isPrivate: boolean("is_private").notNull().default(false),
  userId: integer("user_id").notNull(),
});

export const markdownFiles = pgTable("markdown_files", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull(),
  path: text("path").notNull(),
  content: text("content").notNull(),
  sha: text("sha").notNull(),
  lastModified: timestamp("last_modified").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  githubId: true,
  username: true,
  accessToken: true,
  avatarUrl: true,
});

export const insertRepositorySchema = createInsertSchema(repositories).pick({
  githubId: true,
  name: true,
  fullName: true,
  owner: true,
  isPrivate: true,
  userId: true,
});

export const insertMarkdownFileSchema = createInsertSchema(markdownFiles).pick({
  repositoryId: true,
  path: true,
  content: true,
  sha: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Repository = typeof repositories.$inferSelect;
export type InsertMarkdownFile = z.infer<typeof insertMarkdownFileSchema>;
export type MarkdownFile = typeof markdownFiles.$inferSelect;

export interface GitHubFile {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size: number;
  url: string;
}
