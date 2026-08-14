# Security Policy

## Supported Versions

MDS is in public beta. Security fixes are applied to the latest published beta and the `main` branch.

| Version | Supported |
| --- | --- |
| `0.1.0-beta.1` | Yes |
| Earlier versions | No |

## Reporting A Vulnerability

Do not report suspected vulnerabilities in a public issue.

Use the repository's private GitHub security advisory flow when it is available:

<https://github.com/ziyu/mds/security/advisories/new>

If the advisory form is unavailable, contact the repository owner privately and include:

- the affected package and version or commit;
- a minimal reproduction;
- the expected and actual security boundary;
- the practical impact;
- any suggested remediation;
- whether disclosure is time-sensitive.

Please allow time to reproduce and assess the report before public disclosure.

## Trust Boundaries

MDS source may be untrusted. Parser and renderer paths must escape content, reject executable URLs, and avoid turning document attributes into arbitrary browser attributes or handlers.

The built-in HTML renderer uses this URL policy:

- navigation: relative and protocol-relative URLs, HTTP(S), `mailto:`, and `tel:`;
- images, audio/video, embeds, models, files, and downloads: relative and protocol-relative URLs plus HTTP(S);
- executable, local, and unlisted schemes are neutralized and produce an `unsafe-url` diagnostic.

The renderer checks mixed-case and percent-encoded schemes. Raw HTML in Markdown is dropped. This policy only covers built-in renderer paths; a custom block renderer is trusted code and is responsible for any raw HTML it creates.

Themes are trusted code:

- package theme builds may execute TypeScript, JSX, React components, and build plugins;
- built themes may include JavaScript and additional head markup;
- installing and building an untrusted theme package has the same risk as running an untrusted npm build dependency.

Applications embedding rendered MDS are responsible for deciding whether theme JavaScript is allowed in their environment.

The local Editor adds a separate machine boundary:

- `mds edit` binds to loopback and does not expose a LAN listener;
- API requests require an unguessable per-process token and valid local Host/Origin headers;
- document paths are normalized relative `.mds` paths jailed to the selected project root;
- absolute paths, traversal, symbolic-link files, and symlink escapes are rejected;
- request and document sizes are limited, and saves use revision checks plus atomic rename;
- rendered output runs in a sandboxed iframe without same-origin or popup capability.

The session token protects the local write API from cross-site requests; it is not an authentication system for a remotely hosted service. Do not proxy the local Editor to a public interface. Installed theme packages remain trusted local dependencies.
