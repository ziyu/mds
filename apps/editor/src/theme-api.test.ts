import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ThemeBuildError } from "@mds-crate/theme-builder";
import { createUnknownThemeError, ThemeValidationError } from "@mds-crate/theme-loader";
import { describe, expect, it, vi } from "vitest";
import {
  createMdsThemeApi,
  filterWatchInputFiles,
  serializeBuildResult,
  themeApiErrorResponse,
  themeApiErrorStatusCode
} from "../theme-api.js";
import type { PackageThemeBuildResult } from "@mds-crate/theme-builder";

describe("editor theme API helpers", () => {
  it("filters generated output files out of watched package inputs", () => {
    const outputDirectory = "/project/themes/clarity/dist/theme";

    expect(
      filterWatchInputFiles({
        outputDirectory,
        inputFiles: [
          "/project/themes/clarity/package.json",
          "/project/themes/clarity/src/theme.tsx",
          join(outputDirectory, "theme.json"),
          join(outputDirectory, "blocks/hero.html"),
          join(outputDirectory, "assets/imported.css"),
          "/project/themes/clarity/dist/theme-sibling/keep.css"
        ],
        filesWritten: ["theme.json", "blocks/hero.html"]
      })
    ).toEqual([
      "/project/themes/clarity/package.json",
      "/project/themes/clarity/src/theme.tsx",
      "/project/themes/clarity/dist/theme-sibling/keep.css"
    ]);
  });

  it("serializes package theme build results for the browser provider", () => {
    const result: PackageThemeBuildResult = {
      packageDirectory: "/project/themes/clarity",
      outputDirectory: "/project/themes/clarity/dist/theme",
      sourcePath: "/project/themes/clarity/src/theme.tsx",
      inputFiles: ["/project/themes/clarity/package.json"],
      filesWritten: ["theme.json", "blocks/hero.html"],
      diagnostics: [
        {
          severity: "warning",
          code: "empty-theme-name",
          message: "Theme name is empty."
        }
      ],
      metadataPath: ".mds-theme-build.json"
    };

    expect(serializeBuildResult(result)).toEqual({
      packageDirectory: "/project/themes/clarity",
      outputDirectory: "/project/themes/clarity/dist/theme",
      sourcePath: "/project/themes/clarity/src/theme.tsx",
      inputFiles: ["/project/themes/clarity/package.json"],
      filesWritten: ["theme.json", "blocks/hero.html"],
      diagnostics: [
        {
          severity: "warning",
          code: "empty-theme-name",
          message: "Theme name is empty."
        }
      ],
      metadataPath: ".mds-theme-build.json"
    });
  });

  it("serves theme inspection results from the dev server API", async () => {
    const project = await mkdtemp(join(tmpdir(), "mds-editor-theme-inspect-api-"));
    const themesRoot = join(project, "themes");
    const theme = join(themesRoot, "inspectable");
    await mkdir(join(theme, "blocks"), {
      recursive: true
    });
    await writeFile(
      join(theme, "theme.json"),
      JSON.stringify(
        {
          name: "inspectable",
          label: "Inspectable",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(theme, "blocks/hero.html"), '<section class="hero">{{ children }}</section>', "utf8");

    const handler = createThemeApiMiddleware({
      workspaceRoot: project,
      themesRoot
    });
    const response = createMemoryResponse();
    const next = vi.fn();

    await handler(
      {
        url: "/__mds/theme-inspect/inspectable",
        method: "GET"
      },
      response,
      next
    );
    const body = JSON.parse(response.body) as {
      name: string;
      label: string;
      blocks: string[];
      diagnostics: unknown[];
    };

    expect(response.statusCode).toBe(200);
    expect(response.headers["Content-Type"]).toBe("application/json");
    expect(body.name).toBe("inspectable");
    expect(body.label).toBe("Inspectable");
    expect(body.blocks).toEqual(["hero"]);
    expect(body.diagnostics).toEqual([]);
    expect(next).not.toHaveBeenCalled();
  });

  it("serves structured theme inspection errors from the dev server API", async () => {
    const project = await mkdtemp(join(tmpdir(), "mds-editor-theme-inspect-error-api-"));
    const themesRoot = join(project, "themes");
    const theme = join(themesRoot, "broken");
    await mkdir(theme, {
      recursive: true
    });
    await writeFile(join(theme, "theme.json"), "{", "utf8");

    const handler = createThemeApiMiddleware({
      workspaceRoot: project,
      themesRoot
    });
    const response = createMemoryResponse();

    await handler(
      {
        url: "/__mds/theme-inspect/broken",
        method: "GET"
      },
      response,
      vi.fn()
    );
    const body = JSON.parse(response.body) as {
      diagnostics: Array<{
        severity: string;
        code: string;
        stage?: string;
        field?: string;
      }>;
    };

    expect(response.statusCode).toBe(500);
    expect(response.headers["Content-Type"]).toBe("application/json");
    expect(body.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "theme-build-error",
        stage: "read-artifact",
        field: "theme artifact"
      })
    );
    expect(body.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "invalid-theme-manifest",
        stage: "read-artifact",
        field: "theme.json"
      })
    );
  });

  it("maps structured unknown theme diagnostics to not found responses", () => {
    expect(themeApiErrorStatusCode(createUnknownThemeError("missing"))).toBe(404);
    expect(themeApiErrorResponse(createUnknownThemeError("missing"))).toEqual({
      statusCode: 404,
      contentType: "application/json",
      body: JSON.stringify({
        name: "ThemeValidationError",
        message: "Invalid missing theme: ERROR unknown-theme: Unknown theme: missing. (field=theme ref)",
        diagnostics: [
          {
            severity: "error",
            code: "unknown-theme",
            message: "Unknown theme: missing.",
            field: "theme ref"
          }
        ]
      })
    });
  });

  it("keeps non-unknown theme validation failures on the fallback response status", () => {
    expect(
      themeApiErrorStatusCode(
        new ThemeValidationError([
          {
            severity: "error",
            code: "invalid-theme-manifest",
            message: "Theme manifest must be a JSON object."
          }
        ]),
        422
      )
    ).toBe(422);
  });

  it("serializes builder failures as structured build diagnostics", () => {
    expect(themeApiErrorResponse(new ThemeBuildError("merge-assets", new Error("Could not resolve CSS asset.")))).toEqual({
      statusCode: 500,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Could not resolve CSS asset.",
        diagnostics: [
          {
            severity: "error",
            code: "theme-build-error",
            message: "Could not resolve CSS asset.",
            stage: "merge-assets"
          }
        ]
      })
    });
  });

  it("keeps opaque errors as plain text responses", () => {
    expect(themeApiErrorResponse(new Error("Unexpected failure."), 503)).toEqual({
      statusCode: 503,
      contentType: "text/plain",
      body: "Unexpected failure."
    });
  });
});

type ThemeApiMiddleware = (
  request: { url?: string; method?: string },
  response: ReturnType<typeof createMemoryResponse>,
  next: () => void
) => Promise<void>;

interface ThemeApiServerMock {
  watcher: {
    on: () => void;
    add: () => void;
  };
  middlewares: {
    use: (handler: ThemeApiMiddleware) => void;
  };
  ws: {
    send: () => void;
  };
}

function createThemeApiMiddleware(options: { workspaceRoot: string; themesRoot: string }): ThemeApiMiddleware {
  let handler: ThemeApiMiddleware | undefined;
  const plugin = createMdsThemeApi(options);
  const server: ThemeApiServerMock = {
    watcher: {
      on() {},
      add() {}
    },
    middlewares: {
      use(nextHandler: ThemeApiMiddleware) {
        handler = nextHandler;
      }
    },
    ws: {
      send() {}
    }
  } as never;
  const configureServer = plugin.configureServer;

  if (typeof configureServer === "function") {
    (configureServer as unknown as (server: ThemeApiServerMock) => void)(server);
  } else {
    (configureServer?.handler as unknown as ((server: ThemeApiServerMock) => void) | undefined)?.(server);
  }

  if (handler === undefined) {
    throw new Error("Theme API middleware was not registered.");
  }

  return handler;
}

function createMemoryResponse() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: "",
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    end(value: string) {
      this.body = value;
    }
  };
}
