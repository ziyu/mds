import { mkdir, mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findThemePackageDirectoryForArtifact,
  normalizeThemePackagePath,
  normalizeThemeResolutionOptions,
  resolveThemeRef,
  ThemeResolutionError,
  tryResolveThemeArtifactDirectory
} from "./resolution.js";

describe("theme resolution", () => {
  it("normalizes package-relative POSIX paths", () => {
    expect(normalizeThemePackagePath("./dist/theme")).toEqual({
      path: "./dist/theme",
      normalizedPath: "dist/theme"
    });
    expect(normalizeThemePackagePath("././src/theme.tsx")).toEqual({
      path: "././src/theme.tsx",
      normalizedPath: "src/theme.tsx"
    });
    expect(normalizeThemePackagePath("src//./theme.tsx")).toEqual({
      path: "src//./theme.tsx",
      normalizedPath: "src/theme.tsx"
    });
  });

  it("reports package path violations without throwing", () => {
    expect(normalizeThemePackagePath("")).toMatchObject({
      error: {
        code: "empty"
      }
    });
    expect(normalizeThemePackagePath("src\\theme.tsx")).toMatchObject({
      error: {
        code: "unsafe"
      }
    });
    expect(normalizeThemePackagePath("../theme")).toMatchObject({
      error: {
        code: "escape"
      }
    });
  });

  it("resolves artifact directories directly", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-resolution-artifact-"));
    await writeThemeArtifact(join(root, "themes/default"), "direct");

    await expect(
      resolveThemeRef(
        "default",
        normalizeThemeResolutionOptions({
          roots: [join(root, "themes")],
          baseDirectory: root
        })
      )
    ).resolves.toBe(join(root, "themes/default"));
  });

  it("resolves relative theme roots from baseDirectory", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-resolution-relative-root-"));
    await writeThemeArtifact(join(root, "themes/default"), "relative-root");

    await expect(
      resolveThemeRef(
        "default",
        normalizeThemeResolutionOptions({
          roots: ["themes"],
          baseDirectory: root
        })
      )
    ).resolves.toBe(join(root, "themes/default"));
  });

  it("uses baseDirectory for the default themes root", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-resolution-default-root-"));
    await writeThemeArtifact(join(root, "themes/default"), "default-root");

    await expect(
      resolveThemeRef(
        "default",
        normalizeThemeResolutionOptions({
          baseDirectory: root
        })
      )
    ).resolves.toBe(join(root, "themes/default"));
  });

  it("resolves package-style directories to mdsTheme.dist", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-resolution-dir-"));
    await writePackageTheme(root, "themes/clean", "@acme/theme-clean");

    await expect(
      resolveThemeRef(
        "./themes/clean",
        normalizeThemeResolutionOptions({
          roots: [join(root, "themes")],
          baseDirectory: root
        })
      )
    ).resolves.toBe(join(root, "themes/clean/dist/theme"));
  });

  it("resolves package names to built theme artifacts", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-resolution-pkg-"));
    await writePackageTheme(root, "node_modules/@acme/theme-clean", "@acme/theme-clean");

    const resolved = await resolveThemeRef(
      "@acme/theme-clean",
      normalizeThemeResolutionOptions({
        roots: [join(root, "themes")],
        baseDirectory: root
      })
    );

    await expect(realpath(resolved)).resolves.toBe(await realpath(join(root, "node_modules/@acme/theme-clean/dist/theme")));
  });

  it("returns undefined for directories that are not theme artifacts or theme packages", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-resolution-empty-"));
    await mkdir(join(root, "plain"), { recursive: true });

    await expect(tryResolveThemeArtifactDirectory(join(root, "plain"))).resolves.toBeUndefined();
  });

  it("finds a package directory from its built artifact directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-resolution-package-root-"));
    await writePackageTheme(root, "themes/clean", "@acme/theme-clean");

    await expect(
      findThemePackageDirectoryForArtifact(join(root, "themes/clean/dist/theme"), {
        stopAt: root
      })
    ).resolves.toBe(join(root, "themes/clean"));
  });

  it("finds in-place package theme artifact directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-resolution-in-place-package-root-"));
    await writePackageTheme(root, "themes/atelier", "@acme/theme-atelier", ".");

    await expect(
      findThemePackageDirectoryForArtifact(join(root, "themes/atelier"), {
        stopAt: root
      })
    ).resolves.toBe(join(root, "themes/atelier"));
  });

  it("does not treat plain artifact directories as package themes", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-resolution-plain-artifact-root-"));
    await writeThemeArtifact(join(root, "themes/plain"), "plain");

    await expect(
      findThemePackageDirectoryForArtifact(join(root, "themes/plain"), {
        stopAt: root
      })
    ).resolves.toBeUndefined();
  });

  it("does not treat package roots as in-place themes unless mdsTheme.dist points there", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-resolution-ambiguous-package-root-"));
    await writePackageTheme(root, "themes/ambiguous", "@acme/theme-ambiguous");
    await writeThemeArtifact(join(root, "themes/ambiguous"), "ambiguous-root");

    await expect(
      findThemePackageDirectoryForArtifact(join(root, "themes/ambiguous"), {
        stopAt: root
      })
    ).resolves.toBeUndefined();
  });

  it("reports unknown theme refs as structured resolution errors", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-resolution-unknown-"));

    await expect(
      resolveThemeRef(
        "missing-theme",
        normalizeThemeResolutionOptions({
          roots: [join(root, "themes")],
          baseDirectory: root
        })
      )
    ).rejects.toMatchObject({
      name: "ThemeResolutionError",
      code: "unknown-theme",
      field: "theme ref"
    } satisfies Partial<ThemeResolutionError>);
  });
});

async function writePackageTheme(
  root: string,
  packageDirectory: string,
  packageName: string,
  dist = "./dist/theme"
): Promise<void> {
  const directory = join(root, packageDirectory);
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "package.json"),
    JSON.stringify(
      {
        name: packageName,
        mdsTheme: {
          source: "./src/theme.tsx",
          dist
        }
      },
      null,
      2
    ),
    "utf8"
  );
  await writeThemeArtifact(resolve(directory, dist), packageName);
}

async function writeThemeArtifact(directory: string, name: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "theme.json"),
    JSON.stringify(
      {
        name,
        blocks: "blocks"
      },
      null,
      2
    ),
    "utf8"
  );
}
