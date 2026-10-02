import type { Metadata } from "next";

import { LegalPage, List, Section, TextLink } from "@/components/legal-layout";
import { EFFECTIVE_DATE, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy Policy — ${SITE.name}`,
  description: `How ${SITE.name} handles your data. Short version: there is no account, and your stations, history and recordings stay on your device.`,
};

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" effectiveDate={EFFECTIVE_DATE}>
      <Section title="The short version">
        <p>
          {SITE.name} has no accounts and no server storing your content. Your favorites,
          listening history, recordings, searches and settings stay in storage on your own device.
          We can&apos;t read them, we don&apos;t back them up, and we never sell them. If you
          uninstall the app, they&apos;re gone.
        </p>
        <p>
          The rest of this page explains the exceptions in plain terms — the station directory we
          query, the stations you stream from, anonymous usage signals you can switch off, and
          app updates. {SITE.name} shows no advertising.
        </p>
      </Section>

      <Section title="Who this policy is from">
        <p>
          {SITE.name} is built and owned by {SITE.owner}, who is responsible for this policy and
          for how the app handles data.
        </p>
        {SITE.publisher ? (
          <p>
            The app is published to Google Play through the developer account of {SITE.publisher},
            so that name may appear as the seller or developer on the store listing.{" "}
            {SITE.publisher} is the publisher of record only — it does not receive, store, or
            process any of your data, and it has no access to anything the app keeps on your
            device.
          </p>
        ) : null}
      </Section>

      <Section title="What stays on your device">
        <p>
          The following is written to your device&apos;s own storage and never transmitted to us
          or anyone else:
        </p>
        <List
          items={[
            "Your saved stations (Favorites) and the order you put them in",
            "Your recently played stations and the last station you listened to",
            "Your recent searches",
            "Recordings you make, including the audio files themselves",
            "Onboarding answers: why you listen, and the genres and places you picked",
            "Settings such as language, haptics, sounds, the mobile data notice and your default sleep timer",
            "Any sleep timer that is currently running",
          ]}
        />
        <p>
          There is no account to sign into and no sync. Nothing in this list leaves the device,
          which also means it does not move with you if you switch phones.
        </p>
        <p>
          On Android, the app also keeps a small file of your Favorites and recent stations on
          the device so Android Auto can show them in your car. It is read by the app&apos;s own
          car screen and goes nowhere else.
        </p>
      </Section>

      <Section title="What leaves your device">
        <p>
          {SITE.name} is a radio player, so it necessarily talks to the wider internet. Five
          things receive information. None of them receives your name, email address or phone
          number, because the app never asks for them.
        </p>

        <p className="text-fg">The RadioBrowser directory</p>
        <p>
          Station listings come from{" "}
          <TextLink href="https://www.radio-browser.info">RadioBrowser</TextLink>, a free
          community-run database. When you search, browse a genre, country, city or language, or
          open a station, your device queries their servers directly. Those queries contain your
          search terms and filters, and — as with any web request — your IP address is visible to
          them. RadioBrowser is an independent service with its own privacy practices.
        </p>

        <p className="text-fg">The radio stations themselves</p>
        <p>
          Audio is streamed directly from each station&apos;s own servers to your device, and
          station logos are loaded from the addresses the station lists. We are not in the middle
          of those connections. This means the station operator, or whoever hosts its stream or
          logo, can see your IP address and the fact that an app identifying itself as{" "}
          {SITE.name} connected — exactly as they would if you opened the same address in a
          browser. Their handling of that is governed by their policies, not ours.
        </p>
        <p>
          Song and show titles are read from the station&apos;s own stream in the same way.
          Recording a station saves that same stream to your device; it does not send anything
          extra to the station or to us.
        </p>

        <p className="text-fg">TelemetryDeck (anonymous usage signals)</p>
        <p>
          To learn which stations fail to play and whether playback holds up, the app sends
          anonymous signals to{" "}
          <TextLink href="https://telemetrydeck.com/privacy/">TelemetryDeck</TextLink>, a
          privacy-focused analytics service. A signal says that something happened — for example
          that playback started, failed, or was interrupted — along with:
        </p>
        <List
          items={[
            "The public directory ID and country of the station involved, so broken stations can be spotted",
            "Whether you were on Wi-Fi or mobile data, and how long audio took to start",
            "Counts and durations, such as how many Favorites you have or the length of a sleep timer or recording",
            "Which onboarding steps were reached, and how many options were chosen (not which ones)",
            "Your platform (Android or iOS) and a random ID created on your device",
          ]}
        />
        <p>
          That random ID is not derived from your device or from you. It is scrambled (hashed) on
          your phone before it is sent, hashed again by TelemetryDeck, and erased when you
          uninstall the app or clear its data. Signals never include your name, your search
          text, your location, song titles, or recordings.
        </p>
        <p>
          You can turn this off at any time in Settings → Privacy → &quot;Share anonymous usage
          data&quot;. When it is off, nothing is sent.
        </p>

        <p className="text-fg">Expo Updates (over-the-air updates)</p>
        <p>
          The app can download bug fixes without a full store update. To check whether an update
          applies to your device, it sends your app version and platform to Expo&apos;s servers.
        </p>

        <p className="text-fg">Things you choose to send</p>
        <p>
          When you share a station, the app hands a short text to the app you pick from your
          phone&apos;s share sheet. When you report a problem or request a station, it opens a
          draft in your own email app containing the station&apos;s name and the last playback
          error; nothing is sent unless you press send, and if you do, we receive your email
          address like any other email.
        </p>

        <p className="text-fg">Payments and advertising</p>
        <p>
          The current version of {SITE.name} is free, contains no in-app purchases and shows no
          ads, so no payment data and no advertising identifiers are collected at all. If that
          ever changes, this policy will be updated before it goes live.
        </p>
      </Section>

      <Section title="Location">
        <p>
          {SITE.name} works without your location. If you choose &quot;Stations near you&quot;
          and grant permission, the app reads your approximate location once and your
          phone&apos;s operating system turns it into a country and city. Only that country and
          city are used — as filters in the station directory query described above. Your
          coordinates are never sent to us, never stored by the app, and never included in usage
          signals. You can decline and pick a place by hand instead, and you can withdraw the
          permission at any time in your phone&apos;s settings.
        </p>
      </Section>

      <Section title="What we never do">
        <List
          items={[
            "We don't require an account, email address, or phone number",
            "We don't sell or rent personal information to anyone",
            "We don't show ads or share your listening with advertisers",
            "We don't track you across other apps or websites",
            "We don't access your contacts, camera, photos, or microphone",
            "We don't upload, analyse, or keep copies of your recordings",
          ]}
        />
      </Section>

      <Section title="Permissions the app requests">
        <p>
          <span className="text-fg">Approximate location.</span> Optional, and asked for only
          when you choose to find stations near you. See &quot;Location&quot; above.
        </p>
        <p>
          <span className="text-fg">Background audio.</span> On Android this appears as a
          foreground service permission for media playback, and on iOS as background audio. It
          exists so playback, the sleep timer and recordings continue when you lock your phone or
          switch apps, which is what a radio app is for. It gives us no access to anything else
          on your device.
        </p>
        <p>
          <span className="text-fg">Network access.</span> Needed to reach the directory and the
          stations. The app also checks whether you are on Wi-Fi or mobile data so it can tell
          you when live radio starts using mobile data.
        </p>
        <p>
          Recording does not use your microphone. It saves the station&apos;s stream, and the app
          never asks for microphone access.
        </p>
      </Section>

      <Section title="Deleting your data">
        <p>
          Because everything lives on your device, you are always in full control. In Settings →
          Local data you can clear Favorites, Recents, recent searches, the last station and all
          recordings individually, or clear everything at once. Uninstalling {SITE.name}{" "}
          permanently removes all of it. There is no server-side copy for us to delete, and no
          account to close.
        </p>
        <p>
          Usage signals already sent to TelemetryDeck are anonymous and cannot be traced back to
          you or your device, so there is nothing of yours for us to look up or remove there.
        </p>
      </Section>

      <Section title="Content we don't control">
        <p>
          {SITE.name} plays live streams operated by thousands of independent broadcasters. We do
          not host, moderate, or endorse what any station broadcasts, and station listings come
          from a public directory we do not curate. If a station is broken, mislabelled, or
          objectionable, you can report it from the app or email us.
        </p>
      </Section>

      <Section title="Children">
        <p>
          {SITE.name} is not directed at children under 13, and we do not knowingly collect
          personal information from them. Note that the app plays live radio from an unmoderated
          public directory, and some stations broadcast content intended for adults.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Depending on where you live, you may have the right to ask what personal data is held
          about you, and to have it corrected or deleted. Because {SITE.name} has no accounts and
          keeps your content on your device, we hold nothing that identifies you — but you are
          welcome to ask, and we will answer.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If we ever start handling data differently, we&apos;ll update this page and change the
          effective date at the top. Material changes will also be noted in the app or its store
          listing.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about privacy? Email{" "}
          <TextLink href={`mailto:${SITE.email}`}>{SITE.email}</TextLink>.
        </p>
      </Section>
    </LegalPage>
  );
}
