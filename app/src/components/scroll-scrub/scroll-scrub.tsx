/* Scroll scrub React/TanStack reference implementation. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import "./scroll-scrub.css";

export interface ScrollScrubScene {
  id: string;
  label: string;
  /** Exact first frame of the deployed desktop clip. */
  poster: string;
  /** Exact first frame of mobileClip; provide whenever mobileClip is set. */
  mobilePoster?: string;
  clip: string;
  mobileClip?: string;
  title: string;
  body: string;
  kicker?: string;
  tags?: string[];
  actions?: ReactNode;
  align?: "left" | "right";
  /** Viewport-heights assigned to this scene. More distance means slower scrub. */
  scroll?: number;
  /** 0..0.6. Slow the middle of the clip without changing either seam frame. */
  linger?: number;
  objectPosition?: string;
  mobileObjectPosition?: string;
}

export interface ScrollScrubConnector {
  /** Exact first frame of this connector clip; never substitute a scene still. */
  poster: string;
  /** Exact first frame of mobileClip; provide whenever mobileClip is set. */
  mobilePoster?: string;
  clip: string;
  mobileClip?: string;
  scroll?: number;
}

export interface ScrollScrubTheme {
  background: string;
  ink: string;
  muted: string;
  accent: string;
}

export interface ScrollScrubProps {
  scenes: ScrollScrubScene[];
  /** Leave empty for continuous-forward architecture A. */
  connectors?: (ScrollScrubConnector | null)[];
  theme: ScrollScrubTheme;
  className?: string;
  onActiveSectionChange?: (index: number) => void;
}

interface Segment {
  key: string;
  kind: "scene" | "connector";
  sectionIndex: number;
  nextSectionIndex: number;
  poster: string;
  mobilePoster?: string;
  clip: string;
  mobileClip?: string;
  weight: number;
  linger: number;
  objectPosition: string;
  mobileObjectPosition: string;
  scene?: ScrollScrubScene;
}

interface RuntimeSegment extends Segment {
  band: HTMLElement;
  layer: HTMLElement;
  start: number;
  end: number;
  current: number;
  target: number;
  visible: boolean;
  loading: boolean;
  ready: boolean;
  failed: boolean;
  loadedSource?: string;
  video?: HTMLVideoElement;
  objectUrl?: string;
  abort?: AbortController;
}

type ThemeStyle = CSSProperties & Record<`--ss-${string}`, string | number>;

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const smoothstep = (value: number) => {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
};

const lingerEase = (value: number, amount: number) => {
  const x = clamp(value);
  const linger = clamp(amount, 0, 0.6);
  const centered = x - 0.5;
  return (1 - linger) * x + linger * (4 * centered ** 3 + 0.5);
};

function buildSegments(
  scenes: ScrollScrubScene[],
  connectors: (ScrollScrubConnector | null)[]
): Segment[] {
  const result: Segment[] = [];

  for (const [index, scene] of scenes.entries()) {
    if (scene.mobileClip && !scene.mobilePoster) {
      throw new Error(`Scene ${scene.id} needs mobilePoster for mobileClip`);
    }
    result.push({
      clip: scene.clip,
      key: `scene:${scene.id}`,
      kind: "scene",
      linger: scene.linger ?? 0,
      mobileClip: scene.mobileClip,
      mobilePoster: scene.mobilePoster,
      mobileObjectPosition:
        scene.mobileObjectPosition ?? scene.objectPosition ?? "50% 50%",
      nextSectionIndex: index,
      objectPosition: scene.objectPosition ?? "50% 50%",
      poster: scene.poster,
      scene,
      sectionIndex: index,
      weight: scene.scroll ?? 1.4,
    });

    const connector = connectors[index];
    if (index < scenes.length - 1 && connector?.clip) {
      if (connector.mobileClip && !connector.mobilePoster) {
        throw new Error(
          `Connector after ${scene.id} needs mobilePoster for mobileClip`
        );
      }
      const nextScene = scenes[index + 1];
      result.push({
        clip: connector.clip,
        key: `connector:${scene.id}:${nextScene.id}`,
        kind: "connector",
        linger: 0,
        mobileClip: connector.mobileClip,
        mobilePoster: connector.mobilePoster,
        mobileObjectPosition:
          nextScene.mobileObjectPosition ??
          nextScene.objectPosition ??
          "50% 50%",
        nextSectionIndex: index + 1,
        objectPosition: nextScene.objectPosition ?? "50% 50%",
        poster: connector.poster,
        sectionIndex: index,
        weight: connector.scroll ?? 0.8,
      });
    }
  }

  return result;
}

export function ScrollScrub({
  scenes,
  connectors,
  theme,
  className,
  onActiveSectionChange,
}: ScrollScrubProps) {
  const rootRef = useRef<HTMLElement>(null);
  const onActiveRef = useRef(onActiveSectionChange);
  const [activeSection, setActiveSection] = useState(0);
  const segments = useMemo(
    () => buildSegments(scenes, connectors ?? []),
    [connectors, scenes]
  );

  // Keep the latest callback reachable from the scroll loop without making it a
  // dependency of the controller effect. Synced in an effect, never during
  // render — a render-phase ref write breaks under React Compiler.
  useEffect(() => {
    onActiveRef.current = onActiveSectionChange;
  }, [onActiveSectionChange]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || segments.length === 0) {
      return;
    }

    const layerNodes = [
      ...root.querySelectorAll<HTMLElement>("[data-scroll-scrub-layer]"),
    ];
    const bandNodes = [
      ...root.querySelectorAll<HTMLElement>("[data-scroll-scrub-band]"),
    ];
    if (
      layerNodes.length !== segments.length ||
      bandNodes.length !== segments.length
    ) {
      throw new Error("ScrollScrub segment markup is out of sync");
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const coarsePointer = window.matchMedia(
      "(hover: none) and (pointer: coarse)"
    ).matches;
    const smallViewport = window.matchMedia("(max-width: 860px)");
    const isMobile = () => coarsePointer || smallViewport.matches;
    const sourceFor = (segment: RuntimeSegment) =>
      segment.clip;
    const runtime: RuntimeSegment[] = segments.map((segment, index) => ({
      ...segment,
      band: bandNodes[index],
      current: 0,
      end: 0,
      failed: false,
      layer: layerNodes[index],
      loading: false,
      ready: false,
      start: 0,
      target: 0,
      visible: index === 0,
    }));

    let active = -1;
    let destroyed = false;
    let dirty = true;
    let frame = 0;
    let rootTop = 0;
    let total = 1;
    let viewportHeight = window.innerHeight;
    let layoutWidth = window.innerWidth;
    let userReady = false;
    let previousY = 0;
    let direction = 1;
    let lastTick = 0;
    let inJourney = true;
    let displayedY: number | undefined;
    let timelineMoving = false;
    let waitingForMedia = false;
    const wake = () => {
      if (!destroyed && !frame && !document.hidden) frame = requestAnimationFrame(tick);
    };

    const unloadClip = (segment: RuntimeSegment) => {
      segment.abort?.abort();
      if (segment.video) {
        segment.video.pause();
        segment.video.removeAttribute("src");
        segment.video.load();
        segment.video.remove();
      }
      if (segment.objectUrl) {
        URL.revokeObjectURL(segment.objectUrl);
      }
      delete segment.abort;
      delete segment.video;
      delete segment.objectUrl;
      delete segment.loadedSource;
      segment.loading = false;
      segment.ready = false;
      segment.failed = false;
      segment.current = segment.target;
      delete segment.layer.dataset.videoPainted;
      delete segment.layer.dataset.videoFailed;
    };

    const layout = () => {
      const pageY = window.scrollY || window.pageYOffset;
      rootTop = root.getBoundingClientRect().top + pageY;
      viewportHeight = window.innerHeight;
      layoutWidth = window.innerWidth;

      for (const segment of runtime) {
        if (
          segment.loadedSource &&
          segment.loadedSource !== sourceFor(segment)
        ) {
          unloadClip(segment);
        }
        const rect = segment.band.getBoundingClientRect();
        segment.start = rect.top + pageY - rootTop;
        segment.end = segment.start + rect.height;
      }
      total = Math.max(runtime.at(-1)?.end ?? viewportHeight, viewportHeight);
      dirty = true;
      wake();
    };

    const primeVideo = async (video?: HTMLVideoElement) => {
      if (!video || !isMobile()) {
        return;
      }
      try {
        await video.play();
        video.pause();
      } catch {
        // Keep the poster; a later user gesture/seek can retry naturally.
      }
    };

    const loadClip = async (segment: RuntimeSegment) => {
      const source = sourceFor(segment);
      if (
        reduceMotion ||
        destroyed ||
        segment.loading ||
        segment.ready ||
        segment.failed ||
        !source
      ) {
        return;
      }

      segment.loading = true;
      segment.loadedSource = source;
      segment.abort = new AbortController();
      const request = segment.abort;

      try {
        // Mobile browsers can range-load the original file immediately instead
        // of waiting for a complete HD blob before the first frame can move.
        let objectUrl: string | undefined;
        if (!isMobile()) {
          const response = await fetch(source, { signal: request.signal });
          if (!response.ok) throw new Error(`Clip failed: ${response.status}`);
          const blob = await response.blob();
          if (destroyed || request.signal.aborted || segment.loadedSource !== source) return;
          objectUrl = URL.createObjectURL(blob);
        }
        const video = document.createElement("video");
        video.className = "scroll-scrub__video";
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.disablePictureInPicture = true;


        video.addEventListener(
          "loadedmetadata",
          () => {
            if (segment.video !== video || segment.loadedSource !== source) {
              return;
            }
            segment.ready = video.readyState >= 2;
            segment.loading = !segment.ready;
            dirty = true;
            wake();
          },
          { once: true }
        );
        const onData = () => {
          if (segment.video !== video || segment.loadedSource !== source) return;
          segment.ready = video.readyState >= 2;
          segment.loading = !segment.ready;
          dirty = true;
          wake();
        };
        video.addEventListener("loadeddata", onData);
        video.addEventListener("canplay", onData);
        video.addEventListener("progress", onData);
        video.addEventListener(
          "error",
          () => {
            if (segment.video !== video) {
              return;
            }
            video.remove();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            delete segment.video;
            delete segment.objectUrl;
            segment.failed = true;
            segment.loading = false;
            segment.ready = false;
            delete segment.layer.dataset.videoPainted;
            segment.layer.dataset.videoFailed = "true";
            dirty = true;
            wake();
          },
          { once: true }
        );
        video.addEventListener("seeked", () => {
          if (segment.video === video && segment.loadedSource === source) {
            segment.layer.dataset.videoPainted = "true";
            wake();
          }
        });

        segment.layer.append(video);
        segment.objectUrl = objectUrl;
        segment.video = video;
        video.src = objectUrl ?? source;
        video.load();
        if (userReady) void primeVideo(video);
      } catch (error) {
        if (
          request.signal.aborted ||
          (error instanceof Error && error.name === "AbortError") ||
          segment.loadedSource !== source
        ) {
          return;
        }
        segment.layer.dataset.videoFailed = "true";
        segment.failed = true;
        segment.loading = false;
      }
    };

    const readScroll = (dt: number) => {
      const pageY = window.scrollY || window.pageYOffset;
      const targetY = clamp(pageY - rootTop, 0, total);
      const outsideJourney = pageY < rootTop - viewportHeight || pageY > rootTop + total;
      waitingForMedia = false;
      // Smooth the whole mobile journey, including chapter boundaries. Smoothing
      // each clip alone lets a fast touch swipe jump straight to the next poster.
      if (displayedY === undefined || !isMobile() || reduceMotion || outsideJourney) displayedY = targetY;
      const delta = targetY - displayedY;
      const step = Math.sign(delta) * Math.min(Math.abs(delta) * (1 - Math.exp(-dt / 140)), viewportHeight * dt / 450);
      let nextY = displayedY + step;
      if (isMobile() && !reduceMotion && !outsideJourney) {
        const destination = runtime.find(segment => nextY >= segment.start && nextY < segment.end);
        if (destination && !destination.ready && !destination.failed) {
          waitingForMedia = true;
          void loadClip(destination);
          nextY = displayedY;
        }
      }
      displayedY = Math.abs(targetY - nextY) < 0.5 ? targetY : nextY;
      timelineMoving = Math.abs(targetY - displayedY) >= 0.5;
      const y = displayedY;
      const crossfade = 0.04 * viewportHeight;
      inJourney = !document.hidden && pageY >= rootTop - viewportHeight && pageY <= rootTop + total;
      if (Math.abs(y - previousY) > 1) direction = y > previousY ? 1 : -1;
      previousY = y;
      let currentIndex = 0;

      for (const [index, segment] of runtime.entries()) {
        if (y >= segment.start) {
          currentIndex = index;
        }

        const length = Math.max(segment.end - segment.start, 1);
        const local = clamp((y - segment.start) / length);
        segment.target = segment.linger
          ? lingerEase(local, segment.linger)
          : local;

        let outside = 0;
        if (y < segment.start) {
          outside = segment.start - y;
        }
        if (y > segment.end) {
          outside = y - segment.end;
        }
        let opacity = smoothstep(1 - outside / Math.max(crossfade, 1));
        if (reduceMotion) {
          opacity = outside === 0 ? 1 : 0;
        }

        segment.visible = opacity > 0.001;
        segment.layer.style.opacity = String(opacity);
        segment.layer.style.zIndex = index === currentIndex ? "2" : "1";


      }

      // At most two decoders: the current chapter and its next neighbour.
      const visibleNeighbour = runtime.findIndex((segment, index) => index !== currentIndex && segment.visible);
      const neighbour = visibleNeighbour >= 0 ? visibleNeighbour : currentIndex + direction;
      for (const [index, segment] of runtime.entries()) {
        if (inJourney && (index === currentIndex || index === neighbour)) {
          void loadClip(segment);
        } else if (segment.video || segment.loading) {
          unloadClip(segment);
        }
      }

      const current = runtime[currentIndex];
      const currentLength = Math.max(current.end - current.start, 1);
      const currentProgress = clamp((y - current.start) / currentLength);
      const nextActive =
        current.kind === "connector" && currentProgress >= 0.5
          ? current.nextSectionIndex
          : current.sectionIndex;

      if (nextActive !== active) {
        active = nextActive;
        root.dataset.activeSection = String(active);
        setActiveSection(active);
        onActiveRef.current?.(active);
      }

      root.style.setProperty("--ss-progress", String(clamp(y / total)));
    };

    const updateVideos = (dt: number) => {
      let unsettled = false;
      if (!inJourney || reduceMotion) return false;
      const alpha = 1 - Math.exp(-dt / 85);
      for (const segment of runtime) {
        const { video } = segment;
        if (!video || !segment.ready || !segment.visible) continue;
        segment.current += (segment.target - segment.current) * (isMobile() ? 1 : alpha);
        if (Math.abs(segment.current - segment.target) < 0.0005) segment.current = segment.target;
        else unsettled = true;
        // Seek only to an actual frame, never repeatedly decode the same frame.
        const duration = video.duration || 1;
        const finalFrame = Math.max(0, Math.ceil(duration * 24) - 1);
        const frameIndex = Math.min(finalFrame, Math.round(clamp(segment.current) * finalFrame));
        const targetTime = frameIndex / 24;
        if (!video.seeking && Math.abs(video.currentTime - targetTime) > 1 / 48) {
          try { video.currentTime = targetTime; } catch { /* Preserve last painted frame. */ }
        }
      }
      return unsettled;
    };

    const tick = (now: number) => {
      frame = 0;
      if (destroyed || document.hidden) return;
      const dt = lastTick ? Math.min(50, now - lastTick) : 16.7;
      lastTick = now;
      if (dirty || timelineMoving) { dirty = false; readScroll(dt); }
      const videosMoving = updateVideos(dt);
      // Await media readiness events instead of spinning while a clip downloads.
      if (videosMoving || (timelineMoving && !waitingForMedia)) wake();
    };

    const onScroll = () => { dirty = true; wake(); };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame); frame = 0;
        for (const segment of runtime) unloadClip(segment);
      } else { lastTick = 0; onScroll(); }
    };
    const onResize = () => {
      if (coarsePointer && window.innerWidth === layoutWidth) {
        return;
      }
      layout();
    };
    const onFirstGesture = () => {
      if (userReady) {
        return;
      }
      userReady = true;
      for (const segment of runtime) {
        void primeVideo(segment.video);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", layout);
    window.addEventListener("pointerdown", onFirstGesture, {
      once: true,
      passive: true,
    });
    window.addEventListener("touchstart", onFirstGesture, {
      once: true,
      passive: true,
    });

    layout();
    wake();

    return () => {
      destroyed = true;
      window.cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", layout);
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("touchstart", onFirstGesture);
      root.style.removeProperty("--ss-progress");
      delete root.dataset.activeSection;

      for (const segment of runtime) {
        unloadClip(segment);
        segment.layer.style.removeProperty("opacity");
        segment.layer.style.removeProperty("z-index");
      }
    };
  }, [segments]);

  if (scenes.length === 0) {
    return null;
  }

  const themeStyle: ThemeStyle = {
    "--ss-accent": theme.accent,
    "--ss-bg": theme.background,
    "--ss-ink": theme.ink,
    "--ss-muted": theme.muted,
  };

  return (
    <section
      className={["scroll-scrub", className].filter(Boolean).join(" ")}
      ref={rootRef}
      style={themeStyle}
    >
      <div className="scroll-scrub__stage">
        <div className="scroll-scrub__mobile-copy">
          {scenes.map((scene, index) => (
            <div key={scene.id} hidden={activeSection !== index}>
              <p role="heading" aria-level={index === 0 ? 1 : 2} className="scroll-scrub__title">{scene.title}</p>
              <p className="scroll-scrub__body">{scene.body}</p>
              {scene.actions ? <div className="scroll-scrub__actions">{scene.actions}</div> : null}
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="scroll-scrub__media">
          {segments.map((segment, index) => {
            const layerStyle: ThemeStyle = {
              "--ss-mobile-position": segment.mobileObjectPosition,
              "--ss-object-position": segment.objectPosition,
            };
            return (
              <figure
                className={`scroll-scrub__layer scroll-scrub__layer--${segment.kind}`}
                data-scroll-scrub-layer=""
                key={segment.key}
                style={layerStyle}
              >
                <picture className="scroll-scrub__picture">
                  <img
                    alt=""
                    className="scroll-scrub__poster"
                    decoding="async"
                    fetchPriority={index === 0 ? "high" : "auto"}
                    loading={index === 0 ? "eager" : "lazy"}
                    src={segment.poster}
                  />
                </picture>
              </figure>
            );
          })}
        </div>

        <div aria-hidden="true" className="scroll-scrub__progress">
          <span />
        </div>

      </div>

      <div className="scroll-scrub__story">
        {segments.map((segment) => {
          const bandStyle: CSSProperties = {
            minHeight: `${Math.max(segment.weight, 0.2) * 100}svh`,
          };

          if (segment.kind === "connector") {
            return (
              <div
                aria-hidden="true"
                className="scroll-scrub__connector-band"
                data-scroll-scrub-band=""
                key={segment.key}
                style={bandStyle}
              />
            );
          }

          const { scene } = segment;
          if (!scene) {
            return null;
          }
          const Heading = segment.sectionIndex === 0 ? "h1" : "h2";

          return (
            <article
              className="scroll-scrub__chapter"
              data-align={scene.align ?? "left"}
              data-scroll-scrub-band=""
              id={scene.id}
              key={segment.key}
              style={bandStyle}
            >
              <div className="scroll-scrub__chapter-pin">
                <div className="scroll-scrub__copy">
                  {scene.kicker ? (
                    <p className="scroll-scrub__kicker">{scene.kicker}</p>
                  ) : null}
                  <Heading className="scroll-scrub__title">
                    {scene.title}
                  </Heading>
                  <p className="scroll-scrub__body">{scene.body}</p>
                  {scene.tags?.length ? (
                    <ul className="scroll-scrub__tags">
                      {scene.tags.map((tag) => (
                        <li key={tag}>{tag}</li>
                      ))}
                    </ul>
                  ) : null}
                  {scene.actions ? (
                    <div className="scroll-scrub__actions">{scene.actions}</div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
