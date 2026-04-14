import type { ShogunBrain } from "../brain.js";
import type { OAuthTokenManager } from "./oauth.js";
import { logger } from "../logger.js";

/**
 * Linear integration: imports issues and projects into SHOGUN memory.
 *
 * Uses Linear GraphQL API to:
 * - Fetch issues → create concept pages
 * - Track issue state changes as timeline entries
 * - Extract assignees → link to person pages
 */

export class LinearIntegration {
  private baseUrl = "https://api.linear.app/graphql";

  constructor(
    private brain: ShogunBrain,
    private apiKey: string // Linear uses API key, not OAuth
  ) {}

  async ingestIssues(options?: {
    limit?: number;
    teamKey?: string;
  }): Promise<{ issues: number; created: number }> {
    const limit = options?.limit ?? 50;

    const teamFilter = options?.teamKey
      ? `team: { key: { eq: "${options.teamKey}" } }`
      : "";

    const query = `{
      issues(
        first: ${limit}
        orderBy: updatedAt
        ${teamFilter ? `filter: { ${teamFilter} }` : ""}
      ) {
        nodes {
          id
          identifier
          title
          description
          state { name }
          assignee { name }
          labels { nodes { name } }
          createdAt
          updatedAt
          url
          priority
          team { key name }
        }
      }
    }`;

    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiKey,
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      logger.error(`Linear API error: ${res.status}`);
      return { issues: 0, created: 0 };
    }

    const data = await res.json() as {
      data: {
        issues: {
          nodes: {
            id: string;
            identifier: string;
            title: string;
            description: string | null;
            state: { name: string };
            assignee: { name: string } | null;
            labels: { nodes: { name: string }[] };
            createdAt: string;
            updatedAt: string;
            url: string;
            priority: number;
            team: { key: string; name: string };
          }[];
        };
      };
    };

    const issues = data.data?.issues?.nodes ?? [];
    let created = 0;

    for (const issue of issues) {
      const slug = `concepts/linear-${issue.identifier.toLowerCase()}`;
      const existing = await this.brain.pages.getPage(slug);
      if (existing) continue;

      const truth = [
        `${issue.identifier}: ${issue.title}`,
        `State: ${issue.state.name}`,
        issue.assignee ? `Assignee: ${issue.assignee.name}` : "",
        `Team: ${issue.team.name}`,
        `Priority: ${issue.priority}`,
        "",
        issue.description ?? "",
      ].filter(Boolean).join("\n");

      await this.brain.pages.putPage({
        slug,
        type: "concept",
        title: `${issue.identifier}: ${issue.title}`,
        compiled_truth: truth.slice(0, 10000),
        frontmatter: {
          source: "linear",
          linear_id: issue.id,
          linear_url: issue.url,
          state: issue.state.name,
        },
      });

      const page = await this.brain.pages.getPage(slug);
      if (page) {
        await this.brain.tags.addTag(page.id, "linear");
        await this.brain.tags.addTag(page.id, `team:${issue.team.key}`);
        for (const label of issue.labels.nodes) {
          await this.brain.tags.addTag(page.id, label.name.toLowerCase());
        }
        await this.brain.timeline.addEntry(
          page.id,
          issue.createdAt.slice(0, 10),
          `Issue created: ${issue.title}`,
          "linear"
        );
      }
      created++;
    }

    logger.info(`Linear ingest: ${issues.length} issues, ${created} created`);
    return { issues: issues.length, created };
  }
}
