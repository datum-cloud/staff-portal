import { useEffect } from 'react';

export default function MarkerIoEmbed({ nonce }: { nonce: string }) {
  useEffect(() => {
    // Config
    window.markerConfig = {
      project: '687952f45b4bbadf4fa3f66e',
      source: 'snippet',
    };

    // Load shim
    if (!window.__Marker) {
      window.__Marker = {};
      const queue: any[] = [];
      const markerStub: any = { __cs: queue };
      const methods = [
        'show',
        'hide',
        'isVisible',
        'capture',
        'cancelCapture',
        'unload',
        'reload',
        'isExtensionInstalled',
        'setReporter',
        'clearReporter',
        'setCustomData',
        'on',
        'off',
      ];

      methods.forEach((method) => {
        markerStub[method] = (...args: any[]) => {
          queue.push([method, ...args]);
        };
      });

      window.Marker = markerStub;

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://edge.marker.io/latest/shim.js';
      script.nonce = nonce;
      document.body.appendChild(script);
    }
  }, [nonce]);

  return null;
}
