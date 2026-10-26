import { useEffect, useRef } from 'react';
export function MethodologyDrawer({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    d.showModal();
    return () => {
      d.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog ref={dialog} aria-labelledby="method-title" onCancel={onClose} onClose={onClose}>
      <header>
        <h2 id="method-title">Model & methodology</h2>
        <button onClick={onClose}>Close methodology</button>
      </header>
      <p>
        <strong>AN completion + 90 seconds; assumes uninterrupted ammunition production.</strong>{' '}
        Construction is observed. Readiness is modeled for every AN type, including missing type.
        Actual ammunition telemetry is not required.
      </p>
      <h3>Ongoing-game denominator</h3>
      <p>
        Recorded roster slots in still-ongoing inferred-full 8v8 games with an effective duration
        strictly greater than the selected time. Unknown durations use a user-approved 30:00
        placeholder, including invalid/conflicting endpoints that remain flagged for review. Game 7
        uses the user-confirmed 29:03 correction for the exact 29:03:00 Sheet export token.
        Recorded, placeholder and corrected endpoints are labeled separately; raw values are
        retained and the Sheet is unchanged. These are not verified surviving players or intact
        bases. Invalid completion/type contradictions are unknown, not negatives. The eligible
        cohort changes across time. Blank completion means no owned AN before game end under the
        chosen endpoint assumption.
      </p>
      <p>
        The Modeled Timing Window uses this same calculation at every clock second. All roles shows
        recorded target coverage per position, with position-specific denominators rather than the
        pooled percentage cards. An individual Role shows both own AN readiness and recorded target
        coverage, agreeing with the cards. Ended games leave each numerator and denominator; they
        are not counted as uncovered afterward. No interpretable observations means a gap, not 0%.
        The timing-basis switch changes OS charts and role milestones, not these modeled readiness
        curves.
      </p>
      <h3>Coverage is separate</h3>
      <p>
        Earliest recorded provider for the target role in the same game and explicit Team ID. An
        owner covers its own role plus listed additional roles. Providers and roster context are
        computed before target filters. Unknown teams block cross-row matching, not own readiness.
        Empty coverage is no recorded coverage, not guaranteed vulnerability. Map geometry,
        destruction, resource stalls, EMP and replenishment are not monitored.
      </p>
      <h3>Opening episode only</h3>
      <p>
        A salvo may contain multiple missiles. The earliest recorded teammate launch is a candidate
        opening; legacy total counts are not salvo size. Launch time is not impact time. A
        launch-time snapshot proves neither a hit nor an interception. Later strikes are not pooled.
      </p>
      <h3>Descriptive evidence</h3>
      <p>
        OS charts use each builder’s own completion/readiness and own OS, never received allied
        coverage or the provider’s OS. Timed-builder medians and OS charts are conditional on
        recorded construction, not population protection probabilities. Partial games remain useful;
        population-style partial analysis is opt-in and sample-labeled. Unranked (-1) is separate
        from numeric OS 0. The same 90-second offset shifts OS timings without creating a new
        relationship. Observational spectated matches are exploratory, not causal evidence or
        launch-success forecasts.
      </p>
      <h3>Builder OS and additional coverage</h3>
      <p>
        The OS &amp; neighboring coverage panel groups valid own AN builders by ten-point OS band,
        with Unranked separate. Bars show the share recording 0, 1, or 2+ unique additional roles;
        the builder’s own role does not count. Blank cells mean none recorded, not a confirmed miss
        or poor placement. Missing coverage columns and unrecognized lists are excluded, not zero.
        Recorded roles do not verify physical adjacency or AN radius geometry.
      </p>
      <p>
        This builder-only sample uses valid completion at or before the effective endpoint,
        independent of Game Clock and timing basis; it includes builds outside the timing viewport
        and valid completion at game end. Use Role to compare the same position. All-role bands mix
        positions; related same-game observations, repeat players and incomplete recording limit
        interpretation. Counts and source records support inspection, not a causal OS effect,
        placement forecast or probability of any player building an AN.
      </p>
      <h3>Front situation at completion</h3>
      <p>
        Front labels describe the builder's team at their own AN completion, not a continuous match
        state. The panel compares valid builders within each position, with a fixed completion
        cutoff of 25:00 and a 12:00–25:00 chart view. Modeled readiness adds 90 seconds, but keeps
        the label attached to completion. Nonbuilders and missing labels are excluded, not treated
        as Equal or uncovered; a provider's label is never copied to allied targets. Partial
        histories remain descriptive evidence, independent of the ongoing-game denominator and Game
        Clock.
      </p>
      <p>
        The shared Front situation selector matches only each target row's recorded completion
        label; missing or unrecognized labels remain in All situations only. Selected percentages
        describe labeled observations, not all-player coverage under that front state. Allied
        providers and match metadata remain available from the full dataset regardless of their
        labels or other target filters.
      </p>
      <p>
        Points show individual records. Medians and middle-50% ranges need at least five builders
        across three games; these are display safeguards, not statistical significance or confidence
        intervals. Equal-baseline timing differences need both same-position groups to qualify. The
        front can change before a build and can be affected by the same economy and decisions that
        affect build time. This is a selected builder sample and an association, not proof of
        causation, a front-specific coverage probability or a build recommendation. Extra nonbuilder
        or endgame logging is not required for this descriptive comparison.
      </p>
      <h3>Source & collection</h3>
      <p>
        Sheet1 stays read-only. Game duration and Replay name can be entered once per game;
        conflicts are surfaced. Replay references are copyable evidence only. The app never opens or
        executes local replay files. Importing disables automatic live refresh until re-enabled.
        Retrieval timestamps are not spreadsheet modification times.
      </p>
    </dialog>
  );
}
