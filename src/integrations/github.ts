import type { ShogunBrain } from "../brain.js";
import { logger } from "../logger.js";

/**
 * GitHub integration: imports issues, PRs, and commits into SHOGUN memory.
 *
 * Uses GitHub API (personal access token) to:
 * - Fetch issues and PRs → create concept pages
 * - Track contributors → auto-create person pages
 * - Store commit history as timeline entries
 *
 * Requires: GITHUB_TOKEN environment variable
 */

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  user: { login: string };
  created_at: string;
  updated_at: string;
  labels: { name: string }[];
}

export class GitHubIntegration {
  private token: string;
  private baseUrl = "https://api.github.com";

  constructor(
    private brain: ShogunBrain,
    token: string
  ) {
    this.token = token;
  }

  /**
   * Ingest issues from a repository into memory.
   */
  async ingestIssues(owner: string, repo: string, options?: {
    state?: "open" | "closed" | "all";
    limit?: number;
  }): Promise<{ issues: number; pages_created: number }> {
    const state = options?.state ?? "all";
    const limit = options?.limit ?? 50;

    const issues = await this.fetchIssues(owner, repo, state, limit);
    let pagesCreated = 0;

    for (const issue of issues) {
      const slug = `concepts/${owner}-${repo}-issue-${issue.number}`;
      const existing = await this.brain.pages.getPage(slug);
      if (existing) continue;

      await this.brain.pages.putPage({
        slug,
        type: "concept",
        title: `#${issue.number}: ${issue.title}`,
        compiled_truth: issue.body?.slice(0, 5000) ?? "",
        frontmatter: {
          source: "github",
          repo: `${owner}/${repo}`,
          issue_number: issue.number,
          state: issue.state,
        },
      });

      const page = await this.brain.pages.getPage(slug);
      if (page) {
        await this.brain.tags.addTag(page.id, "github");
        await this.brain.tags.addTag(page.id, `repo:${owner}/${repo}`);
        for (const label of issue.labels) {
          await this.brain.tags.addTag(page.id, label.name);
        }

        // Add timeline entries
        await this.brain.timeline.addEntry(
          page.id,
          issue.created_at.slice(0, 10),
          `Issue created by @${issue.user.login}`,
          "github"
        );
      }

      pagesCreated++;
    }

    logger.info(`GitHub ingest: ${issues.length} issues, ${pagesCreated} pages created`);
    return { issues: issues.length, pages_created: pagesCreated };
  }

  /**
   * Ingest recent commits as timeline entries on a repo concept page.
   */
  async ingestCommits(owner: string, repo: string, options?: {
    limit?: number;
    since?: string;
  }): Promise<{ commits: number }> {
    const limit = options?.limit ?? 50;

    const slug = `concepts/${owner}-${repo}`;
    let page = await this.brain.pages.getPage(slug);
    if (!page) {
      await this.brain.pages.putPage({
        slug,
        type: "concept",
        title: `${owner}/${repo}`,
        compiled_truth: `GitHub repository: ${owner}/${repo}`,
        frontmatter: { source: "github", repo: `${owner}/${repo}` },
      });
      page = await this.brain.pages.getPage(slug);
    }

    const params = new URLSearchParams({ per_page: String(limit) });
    if (options?.since) params.set("since", options.since);

    const res = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/commits?${params}`,
      { headers: this.headers() }
    );
    const commits = await res.json() as {
      sha: string;
      commit: { message: string; author: { name: string; date: string } };
    }[];

    if (!Array.isArray(commits)) return { commits: 0 };

    for (const commit of commits) {
      const date = commit.commit.author.date.slice(0, 10);
      const msg = commit.commit.message.split("\n")[0].slice(0, 200);
      await this.brain.timeline.addEntry(
        page!.id,
        date,
        `[${commit.sha.slice(0, 7)}] ${msg} — ${commit.commit.author.name}`,
        "github"
      );
    }

    return { commits: commits.length };
  }

  private async fetchIssues(owner: string, repo: string, state: string, limit: number): Promise<GitHubIssue[]> {
    const res = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/issues?state=${state}&per_page=${limit}`,
      { headers: this.headers() }
    );
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/vnd.github.v3+json",
    };
  }
}
