import { tool } from 'ai';
import { z } from 'zod';

export function createUtilityTools() {
  return {
    getDatumPlatformDocs: tool({
      description:
        'Fetch the full Datum platform documentation including CLI command syntax and usage.' +
        ' Call this before suggesting any datumctl CLI commands to ensure accuracy.',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const res = await fetch('https://www.datum.net/docs/llms-full.txt', {
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) return { error: `Failed to fetch docs: ${res.status}` };
          const text = await res.text();
          const MAX = 200_000;
          return { docs: text.length > MAX ? text.slice(0, MAX) + '\n\n[truncated]' : text };
        } catch (err) {
          return {
            error: `Failed to fetch docs: ${err instanceof Error ? err.message : 'unknown'}`,
          };
        }
      },
    }),

    getDesktopAppInfo: tool({
      description:
        'Get download and installation instructions for the Datum Desktop app.' +
        ' Call this when someone asks how to install or download the Datum Desktop app.',
      inputSchema: z.object({
        os: z
          .enum(['macos', 'windows', 'linux', 'unknown'])
          .describe("The user's operating system"),
      }),
      execute: async ({ os }: { os: 'macos' | 'windows' | 'linux' | 'unknown' }) => {
        const platforms = {
          macos: {
            os: 'macOS',
            brew: 'brew install --cask datum-cloud/tap/desktop',
            directDownload: 'https://github.com/datum-cloud/app/releases/latest/download/Datum.dmg',
            downloadPage: 'https://www.datum.net/download/mac-os/',
            instructions:
              'Install via Homebrew (recommended) or download the .dmg installer directly.',
          },
          windows: {
            os: 'Windows',
            directDownload:
              'https://github.com/datum-cloud/app/releases/latest/download/Datum-setup.exe',
            downloadPage: 'https://www.datum.net/download/windows/',
            instructions: 'Download and run the .exe installer.',
          },
          linux: {
            os: 'Linux',
            directDownload:
              'https://github.com/datum-cloud/app/releases/latest/download/Datum.AppImage',
            downloadPage: 'https://www.datum.net/download/linux/',
            instructions:
              'Download the AppImage, make it executable with `chmod +x Datum.AppImage`, then run it.',
          },
        };

        if (os === 'unknown') {
          return {
            description:
              'Datum Desktop exposes local environments to the internet using QUIC-based tunnels.',
            platforms: Object.values(platforms),
            downloadPage: 'https://www.datum.net/download/',
          };
        }

        return {
          description:
            'Datum Desktop exposes local environments to the internet using QUIC-based tunnels.',
          ...platforms[os],
        };
      },
    }),
  };
}
