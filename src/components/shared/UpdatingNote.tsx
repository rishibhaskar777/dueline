// PayPal's figures are being read again behind what is on screen; this goes when they arrive.
export function UpdatingNote() {
  return (
    <p role="status" className="text-sm text-muted-foreground">
      Updating from PayPal…
    </p>
  );
}
