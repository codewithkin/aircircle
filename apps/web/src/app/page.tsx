import Link from "next/link";

import { Wordmark } from "@/components/wordmark";
import { SITE } from "@/lib/site";

/*
 * The landing page, in the shape of the excuseless one: a hero, a run of
 * hairline-separated sections, a closing call, a footer.
 *
 * There is deliberately no store badge yet. The app is not on Google Play, and
 * a badge that links nowhere is worse than no badge. Add one to <Availability>
 * once the listing exists — SITE.androidPackage is the id it will live under.
 */

const ways = [
  {
    n: "01",
    title: "By name.",
    body: "Type a station or its call sign and press play. The top result is one tap away.",
  },
  {
    n: "02",
    title: "By place.",
    body: "Pick a country or a city, or let the app find what is on air near you.",
  },
  {
    n: "03",
    title: "By genre or language.",
    body: "News, jazz, talk, classical, sports — in the language you want to hear.",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-brand">{children}</p>
  );
}

function Availability({ centered = false }: { centered?: boolean }) {
  return (
    <div className={centered ? "flex flex-col items-center gap-2" : "flex flex-col gap-2"}>
      <span className="inline-flex items-center gap-3 rounded-full border border-line bg-card px-5 py-3 text-sm font-medium text-fg">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-live" />
        Coming soon to Google Play
      </span>
      <span className="font-mono text-xs text-subtle">Free. No account. No ads.</span>
    </div>
  );
}

function Block({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line py-24">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="font-display text-3xl tracking-tight text-fg sm:text-4xl">{title}</h2>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-subtle">{children}</p>
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6">
      {/* Hero */}
      <section className="flex min-h-[88vh] flex-col justify-center py-24">
        <div className="mb-6">
          <Wordmark />
        </div>
        <h1 className="max-w-3xl font-display text-5xl leading-[1.05] tracking-tight text-fg sm:text-7xl">
          Find live radio.
          <br />
          <span className="italic text-brand">Keep listening.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-subtle">
          {SITE.name} finds live internet radio by station, place, language or genre — and keeps
          it playing when your phone is locked.
        </p>
        <div className="mt-10">
          <Availability />
        </div>
      </section>

      {/* Find */}
      <section className="border-t border-line py-24">
        <Eyebrow>Three ways in</Eyebrow>
        <h2 className="font-display text-3xl tracking-tight text-fg sm:text-4xl">
          Your next station is closer than you think.
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {ways.map((w) => (
            <div key={w.n} className="rounded-3xl border border-line bg-card p-6">
              <p className="font-mono text-sm text-brand">{w.n}</p>
              <h3 className="mt-4 text-xl font-semibold text-fg">{w.title}</h3>
              <p className="mt-2 text-subtle">{w.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 font-mono text-sm text-subtle">
          Stations from a public directory, all over the world.
        </p>
      </section>

      <Block title="It keeps playing.">
        Lock your phone or switch apps and the station carries on, with controls on your lock
        screen. If the stream drops, {SITE.name} reconnects on its own and tries a station&apos;s
        alternate stream when the main one fails.
      </Block>

      <Block title="Your stations, one tap away.">
        Tap the heart and a station becomes a preset. Your favorites and the stations you played
        recently are waiting on the first screen, in the order you put them — and they still open
        when the directory is unreachable.
      </Block>

      <Block title="Fall asleep to it.">
        Set a sleep timer by dragging a ring or picking a time. Playback stops when it runs out,
        even with the phone locked.
      </Block>

      <Block title="Save it for later.">
        Record a station while it plays and listen again without a connection. Recordings stay on
        your phone, for you.
      </Block>

      <Block title="In the car, and in your language.">
        Browse your favorites, recent stations and genres from Android Auto. The app itself
        speaks ten languages, and you choose yours on the first screen.
      </Block>

      {/* Privacy */}
      <section className="border-t border-line py-24">
        <Eyebrow>Privacy</Eyebrow>
        <h2 className="font-display text-3xl tracking-tight text-fg sm:text-4xl">
          No account. Nothing to sign up for.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-subtle">
          Your favorites, history and recordings live on your phone and nowhere else. There are no
          ads. The only thing the app reports is anonymous signals about whether playback worked,
          and you can switch those off. The{" "}
          <Link href="/privacy" className="text-brand hover:text-brand-bright">
            privacy policy
          </Link>{" "}
          says exactly what that means.
        </p>
      </section>

      {/* Pricing */}
      <Block eyebrow="Pricing" title="Free. The whole thing.">
        Search, favorites, the sleep timer, recording, Android Auto — everything in {SITE.name} is
        free right now. No trial, no paywall, nothing locked behind an upgrade.
      </Block>

      {/* Final CTA */}
      <section className="border-t border-line py-28 text-center">
        <h2 className="font-display text-4xl tracking-tight text-fg sm:text-5xl">
          Somewhere, it&apos;s on air.
        </h2>
        <p className="mt-4 text-lg text-subtle">Find it. Keep it close.</p>
        <div className="mt-10 flex justify-center">
          <Availability centered />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-16">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-xs text-sm text-subtle">
              Live radio by station, place, language or genre.
            </p>
          </div>
          <div className="max-w-sm">
            <p className="text-sm font-medium text-fg">Something broken, or a station missing?</p>
            <p className="mt-2 text-sm text-subtle">
              Write to{" "}
              <a href={`mailto:${SITE.email}`} className="text-brand hover:text-brand-bright">
                {SITE.email}
              </a>
              .
            </p>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-8 font-mono text-xs text-subtle sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} {SITE.name}
          </span>
          <span className="flex gap-5">
            <Link href="/privacy" className="hover:text-fg">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-fg">
              Terms
            </Link>
          </span>
        </div>
      </footer>
    </main>
  );
}
