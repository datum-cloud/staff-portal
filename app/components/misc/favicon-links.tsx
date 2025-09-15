import { Fragment } from 'react';

// Favicon configuration for responsive theme support
const FAVICON_CONFIGS = [
  {
    rel: 'apple-touch-icon' as const,
    sizes: '180x180',
    filename: 'apple-touch-icon.png',
  },
  {
    rel: 'icon' as const,
    type: 'image/png',
    sizes: '32x32',
    filename: 'favicon-32x32.png',
  },
  {
    rel: 'icon' as const,
    type: 'image/png',
    sizes: '16x16',
    filename: 'favicon-16x16.png',
  },
  {
    rel: 'manifest' as const,
    filename: 'site.webmanifest',
  },
] as const;

/**
 * Generates favicon link elements that respond to system theme changes
 */
export function FaviconLinks() {
  return (
    <>
      {FAVICON_CONFIGS.map((config) => {
        const linkProps = {
          rel: config.rel,
          ...('type' in config && { type: config.type }),
          ...('sizes' in config && { sizes: config.sizes }),
        };
        return (
          <Fragment key={`${config.rel}-${config.filename}`}>
            {/* Dark favicon for light theme */}
            <link
              {...linkProps}
              href={`/favicons/dark/${config.filename}`}
              media="(prefers-color-scheme: light)"
            />
            {/* Light favicon for dark theme */}
            <link
              {...linkProps}
              href={`/favicons/light/${config.filename}`}
              media="(prefers-color-scheme: dark)"
            />
          </Fragment>
        );
      })}
    </>
  );
}
