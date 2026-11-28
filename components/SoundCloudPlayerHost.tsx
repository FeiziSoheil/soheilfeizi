'use client';

import React, { useEffect, useRef } from 'react';
import { soundEngine } from '@/lib/soundEngine';

/**
 * Single SoundCloud iframe for the whole site.
 * Mounts during gateway so the Widget API + stream warm before play starts.
 * When After Hours provides a slot, the same DOM node is moved there (no reload).
 */
export default function SoundCloudPlayerHost({
  embedUrl,
  slot,
  visible,
}: {
  embedUrl: string;
  slot: HTMLElement | null;
  visible: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fallbackHostRef = useRef<HTMLDivElement | null>(null);
  const registeredUrlRef = useRef<string | null>(null);

  useEffect(() => {
    void soundEngine.preloadApi();
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const force = registeredUrlRef.current !== null && registeredUrlRef.current !== embedUrl;
    registeredUrlRef.current = embedUrl;
    // Re-bind Widget API after embed URL / src changes so ready+play hooks stay attached
    soundEngine.registerSoundCloudWidget(iframe, { force });
  }, [embedUrl]);

  // Move the same iframe node between warm host and After Hours slot — avoids stream reload
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const target = slot && visible ? slot : fallbackHostRef.current;
    if (target && iframe.parentElement !== target) {
      target.appendChild(iframe);
    }
  }, [slot, visible]);

  return (
    <div
      ref={fallbackHostRef}
      className="pointer-events-none fixed left-0 top-0 z-[-1] h-px w-px overflow-hidden opacity-0"
      aria-hidden="true"
    >
      <iframe
        ref={iframeRef}
        id="sc-player-iframe"
        title="SoundCloud player"
        width="100%"
        height="120"
        scrolling="no"
        frameBorder="no"
        allow="autoplay; encrypted-media"
        src={embedUrl}
        className={`block w-full transition-opacity ${
          visible ? 'opacity-90 hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        tabIndex={visible ? 0 : -1}
        aria-hidden={!visible}
      />
    </div>
  );
}
