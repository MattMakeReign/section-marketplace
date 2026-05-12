/**
 * GitHub commit helper.
 *
 * Used by the V2 marketplace API to commit section bundles directly to the
 * GitHub-hosted registry without a server-side git clone. All writes go
 * through GitHub's REST API via Octokit:
 *
 *   1. Resolve the latest commit on `main`.
 *   2. Create a tree blob for each file in the section.
 *   3. Create a new tree pointing at the existing parent tree + the new blobs.
 *   4. Create a commit on top of the latest commit.
 *   5. Fast-forward `main` to the new commit.
 *
 * Multi-file commits land atomically — either the whole section appears, or
 * none of it does. When the push lands, the Vercel GitHub App (when wired)
 * rebuilds the Library App; the new section becomes browseable ~30s later.
 */

import { Octokit } from "@octokit/rest";

export type FileEntry = {
  /** Path inside the repo, e.g. "sections/cta/banner-acme/section.json". */
  path: string;
  /** "utf8" for text, "base64" for binary (e.g. preview.png). */
  encoding: "utf8" | "base64";
  /** File content. For utf8, plain text. For base64, base64-encoded bytes. */
  content: string;
};

export type CommitResult = {
  commitSha: string;
  commitUrl: string;
  branch: string;
};

export function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN env var is not set. The marketplace API can't write to GitHub without one. " +
        "Set it in Vercel project settings (or .env.local for local dev).",
    );
  }
  return new Octokit({ auth: token });
}

export function getRepoIdentity(): { owner: string; repo: string; branch: string } {
  return {
    owner: process.env.MARKETPLACE_REPO_OWNER ?? "MattMakeReign",
    repo: process.env.MARKETPLACE_REPO_NAME ?? "section-marketplace",
    branch: process.env.MARKETPLACE_REPO_BRANCH ?? "main",
  };
}

/**
 * Atomically commit one or more files to the marketplace repo's main branch.
 * Files with identical content to what's already there are still included in
 * the new tree (GitHub deduplicates). To delete a file, omit it — this helper
 * only ADDS/REPLACES; deletions need a separate path.
 */
export async function commitFiles(args: {
  files: FileEntry[];
  message: string;
  authorName?: string;
  authorEmail?: string;
}): Promise<CommitResult> {
  const { files, message, authorName, authorEmail } = args;
  if (files.length === 0) throw new Error("commitFiles called with no files");

  const octokit = getOctokit();
  const { owner, repo, branch } = getRepoIdentity();

  // 1. Latest commit on branch.
  const refResp = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const latestCommitSha = refResp.data.object.sha;

  const commitResp = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
  const baseTreeSha = commitResp.data.tree.sha;

  // 2. Create blobs for each file (one round-trip each, parallel-safe).
  const blobs = await Promise.all(
    files.map((f) =>
      octokit.git.createBlob({
        owner,
        repo,
        content: f.content,
        encoding: f.encoding,
      }).then((r) => ({ path: f.path, sha: r.data.sha })),
    ),
  );

  // 3. New tree with the new blobs layered on top of the existing tree.
  const treeResp = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: blobs.map((b) => ({
      path: b.path,
      mode: "100644",
      type: "blob",
      sha: b.sha,
    })),
  });

  // 4. Commit pointing at the new tree, parent = latest commit.
  const newCommitResp = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: treeResp.data.sha,
    parents: [latestCommitSha],
    author: authorName && authorEmail
      ? { name: authorName, email: authorEmail, date: new Date().toISOString() }
      : undefined,
  });

  // 5. Fast-forward main.
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommitResp.data.sha,
    force: false,
  });

  return {
    commitSha: newCommitResp.data.sha,
    commitUrl: newCommitResp.data.html_url,
    branch,
  };
}
