"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo, useReducer, useState } from "react";
import { toast } from "sonner";
import { nextStep, pitchAvailability, pitchesFor, timeOptions } from "@/lib/availability";
import { bookableDates } from "@/lib/booking-rules";
import { type Branch, findBranch } from "@/lib/branches";
import { useErrorMessage } from "@/components/common/states";
import { client, type CreatedBooking } from "@/lib/client";
import { qk } from "@/lib/query";
import { BookingDone } from "./booking-done";
import { BookingForm } from "./booking-form";
import { SummaryBar, SummaryPanel, type SummaryProps } from "./booking-summary";
import { BranchHero } from "./branch-hero";
import { PitchPicker } from "./pitch-picker";
import { initialSelection, selectionReducer } from "./selection";
import { DayPicker, TimePicker } from "./when-pickers";

/** How often the free/taken picture refreshes while the screen is open. */
const REFRESH_MS = 30_000;

/**
 * A branch's booking screen: day → start time → pitch, then the contact form.
 * Availability comes from GET /api/branches/:slug/taken; the server re-checks
 * everything on POST /api/bookings, so this screen only guides the choice.
 */
export function BranchBooking({ slug }: { slug: string }) {
  // The page only renders this for a known slug (it 404s otherwise).
  const branch = findBranch(slug) as Branch;
  const t = useTranslations();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const days = useMemo(() => bookableDates(), []);
  const [selection, dispatch] = useReducer(selectionReducer, days[0] ?? "", initialSelection);
  const [formOpen, setFormOpen] = useState(false);
  const [done, setDone] = useState<CreatedBooking | null>(null);
  const { date, sport, duration, start, fieldId } = selection;

  const taken = useQuery({ queryKey: qk.taken(branch.slug, date), queryFn: () => client.taken(branch.slug, date), refetchInterval: REFRESH_MS });
  const slots = useMemo(() => taken.data ?? [], [taken.data]);
  const options = useMemo(() => timeOptions(branch, pitchesFor(branch, sport), date, duration, slots), [branch, sport, date, duration, slots]);
  const states = useMemo(() => pitchAvailability(branch.fields, slots, start, duration, options), [branch.fields, slots, start, duration, options]);
  const field = branch.fields.find((f) => f.id === fieldId) ?? null;
  const hint = nextStep(fieldId, start, states);

  const onBooked = (booking: CreatedBooking) => {
    setFormOpen(false);
    setDone(booking);
    void queryClient.invalidateQueries({ queryKey: qk.taken(branch.slug, date) });
    window.scrollTo({ top: 0 });
  };

  const onTaken = () => {
    toast.error(t("book.errors.slot_taken"));
    setFormOpen(false);
    dispatch({ type: "clearField" });
    void taken.refetch();
  };

  const onError = (error: unknown) => toast.error(errorMessage(error));

  if (done) {
    return (
      <BookingDone
        branch={branch}
        booking={done}
        onAgain={() => {
          setDone(null);
          dispatch({ type: "reset" });
        }}
      />
    );
  }

  const summary: SummaryProps = { branch, field, date, start, duration, hint, onContinue: () => setFormOpen(true) };

  return (
    <>
      <BranchHero branch={branch} />
      {/* Bottom padding on phones keeps the last pitch clear of the fixed summary bar. */}
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-6 pb-28 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-6 lg:pt-8 lg:pb-10">
        <div className="flex min-w-0 flex-col gap-8">
          <DayPicker days={days} value={date} onChange={(d) => dispatch({ type: "date", date: d })} />
          <TimePicker
            duration={duration}
            onDuration={(d) => dispatch({ type: "duration", duration: d })}
            options={options}
            value={start}
            onChange={(s) => dispatch({ type: "start", start: s })}
            status={taken.status}
            error={taken.error}
            onRetry={() => void taken.refetch()}
          />
          <PitchPicker
            branch={branch}
            sport={sport}
            onSport={(s) => dispatch({ type: "sport", sport: s, fields: branch.fields })}
            states={states}
            value={fieldId}
            onChange={(id) => dispatch({ type: "field", fieldId: id })}
            start={start}
            duration={duration}
            done={hint === null}
          />
        </div>
        <div>
          <SummaryPanel {...summary} />
        </div>
      </div>
      <SummaryBar {...summary} />

      {field && start !== null ? (
        <BookingForm open={formOpen} onOpenChange={setFormOpen} branch={branch} field={field} date={date} start={start} duration={duration} onBooked={onBooked} onTaken={onTaken} onError={onError} />
      ) : null}
    </>
  );
}
