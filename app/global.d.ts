export type {};

declare global {
  var __viteDevServer: ViteDevServer | undefined;

  interface Window {
    [key: string]: any;
  }
}
