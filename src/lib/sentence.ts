// A name can end in a full stop ("Halden Coffee Co."), so a sentence that ends with one does not get
// a second.
export function endSentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}
