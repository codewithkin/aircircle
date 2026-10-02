import type { Metadata } from "next";

import { LegalPage, List, Section, TextLink } from "@/components/legal-layout";
import { EFFECTIVE_DATE, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Terms of Service — ${SITE.name}`,
  description: `The terms you agree to when you use ${SITE.name}.`,
};

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" effectiveDate={EFFECTIVE_DATE}>
      <Section title="Agreement">
        <p>
          These terms apply when you download or use {SITE.name} (the &quot;app&quot;). If you
          don&apos;t agree with them, don&apos;t use the app. If you do use it, you&apos;re
          agreeing to what&apos;s below.
        </p>
      </Section>

      <Section title="Who you're dealing with">
        <p>
          {SITE.name} is built and owned by {SITE.owner} (&quot;we&quot;, &quot;us&quot;). All
          rights in the app belong to us.
        </p>
        {SITE.publisher ? (
          <p>
            The app is distributed on Google Play through the developer account of{" "}
            {SITE.publisher}, which publishes it on our behalf. That means its name may appear as
            the seller or developer on the store listing. {SITE.publisher} acts purely as the
            publisher of record — it does not own the app, does not control how it works, and
            does not receive or process your data. Questions about the app, these terms, or your
            data should come to us at the address at the bottom of this page.
          </p>
        ) : null}
      </Section>

      <Section title={`What ${SITE.name} is`}>
        <p>
          {SITE.name} is a radio player. It lets you search a public directory of internet radio
          stations by name, place, language or genre, play their live streams, save favorites,
          set a sleep timer, and record a station to listen to later on the same device. It runs
          on your device — there&apos;s no account to create and no server holding your content.
        </p>
        <p>
          It is a player, not a broadcaster. We do not operate, own, host, or control any of the
          stations you can reach through it.
        </p>
      </Section>

      <Section title="Stations and content are third-party">
        <p>
          Station listings come from RadioBrowser, an independent community-run directory, and
          the audio is streamed directly from each broadcaster&apos;s own servers to your device.
          We are not a party to that connection.
        </p>
        <p>
          This has consequences worth stating plainly. We do not curate, moderate, verify, or
          endorse what any station broadcasts. Stations may go offline, change format, move their
          stream, limit how many people can listen, or disappear from the directory without
          warning, and we have no control over any of that. Song and show titles come from the
          station and may be missing or wrong. Some stations may broadcast content that is
          inaccurate, offensive, or intended for adults. Any dispute about what a station
          broadcasts is between you and that broadcaster.
        </p>
        <p>
          You are responsible for making sure your use of a given stream is lawful where you are.
          Some broadcasters restrict listening by region or prohibit certain uses in their own
          terms.
        </p>
      </Section>

      <Section title="Recordings">
        <p>
          Recording exists so you can listen again later, privately, on the device that made the
          recording. Recordings are saved only on that device and are never uploaded.
        </p>
        <p>
          What you record belongs to the broadcaster and to the artists and rights holders whose
          work it carries — not to you, and not to us. You may only record where the law in your
          country and the broadcaster&apos;s own terms allow it, and only for your own personal,
          non-commercial listening. You must not share, publish, sell, rebroadcast, or otherwise
          distribute recordings. We may limit or remove recording for particular stations, or
          altogether, at any time.
        </p>
      </Section>

      <Section title="Your responsibilities">
        <List
          items={[
            "Use the app lawfully, and don't use it to do anything illegal",
            "Don't rebroadcast or redistribute station streams or recordings in breach of the broadcaster's rights",
            "Don't use the app while driving in a way that takes your attention off the road — in the car, use Android Auto and your vehicle's own controls",
            "Don't reverse-engineer, decompile, or attempt to extract the app's source code",
            "Don't redistribute, resell, or sublicense the app",
          ]}
        />
      </Section>

      <Section title="Your data is yours">
        <p>
          Your favorites, listening history, searches and settings belong to you and stay on your
          device. We claim no ownership of them and, as explained in the{" "}
          <TextLink href="/privacy">Privacy Policy</TextLink>, we never receive them.
        </p>
        <p>
          Because they live only on your device, you are solely responsible for them. If you lose
          your device, uninstall the app, or clear its data, that content — including every
          recording — is gone permanently and we cannot recover it for you.
        </p>
      </Section>

      <Section title="Pricing and future paid features">
        <p>
          The current version of {SITE.name} is free. There are no ads, no in-app purchases, no
          subscriptions, and no paid tier — every feature in the app today is available to you at
          no cost.
        </p>
        <p>
          We may introduce advertising or paid features in a future version. If that happens,
          pricing will be shown clearly before you buy anything, and you will never be charged
          without explicitly confirming the purchase. Any payments would be processed by Google
          Play or the Apple App Store rather than by us, and refunds would be handled by whichever
          store you purchased through, under that store&apos;s own refund policy. These terms and
          the Privacy Policy will be updated before any such change goes live.
        </p>
      </Section>

      <Section title="Availability and changes">
        <p>
          We may update, change, or discontinue features at any time. We may also deliver bug
          fixes and improvements over the air. We try to keep the app working well, but we
          don&apos;t guarantee it will always be available, uninterrupted, or error-free —
          particularly since the directory and the streams themselves are run by others.
        </p>
        <p>
          The sleep timer and background playback depend on your phone&apos;s operating system,
          which can stop apps to save battery. Don&apos;t rely on them for anything that matters.
        </p>
      </Section>

      <Section title="Disclaimer and liability">
        <p>
          The app is provided &quot;as is&quot; and &quot;as available&quot;, without warranties
          of any kind, whether express or implied, to the fullest extent permitted by law. This
          includes any warranty that a particular station will be available, will keep working,
          or will broadcast what its listing says it does.
        </p>
        <p>
          To the fullest extent permitted by law, we are not liable for any indirect, incidental,
          or consequential damages arising from your use of the app — including lost data or
          recordings, mobile data charges from streaming, or anything you encounter in a
          third-party broadcast. Where liability cannot be excluded, it is limited to the amount
          you actually paid for the app in the twelve months before the claim, which for the
          current free version is zero.
        </p>
        <p>
          Nothing in these terms limits any rights you have under mandatory consumer protection
          law in your country.
        </p>
      </Section>

      <Section title="Data usage">
        <p>
          Streaming audio consumes mobile data, and keeps doing so while the app plays in the
          background. {SITE.name} can tell you when playback starts using mobile data, but it has
          no control over your carrier plan or the bitrate a station chooses to broadcast at, and
          any charges your carrier applies are between you and them. If you&apos;re on a metered
          connection, consider listening over Wi-Fi.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          You can stop using {SITE.name} at any time by uninstalling it. We may suspend access if
          you materially breach these terms.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of Zimbabwe. Any dispute will be subject to the
          courts of Zimbabwe, except where mandatory law in your country of residence gives you
          the right to bring proceedings locally.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may revise these terms from time to time. The effective date at the top will change
          when we do. Continuing to use the app after an update means you accept the revised
          terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms? Email{" "}
          <TextLink href={`mailto:${SITE.email}`}>{SITE.email}</TextLink>.
        </p>
      </Section>
    </LegalPage>
  );
}
