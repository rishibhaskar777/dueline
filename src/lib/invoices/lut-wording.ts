// Rule 46 of the CGST Rules, as the invoice states it. PayPal's note carries it in capitals and the
// printed invoice in sentence case, from these same words.
const LUT_WORDING =
  "supply meant for export under bond or letter of undertaking without payment of integrated tax";

export const LUT_DECLARATION = LUT_WORDING.toUpperCase();

export const LUT_ENDORSEMENT = `${LUT_WORDING.charAt(0).toUpperCase()}${LUT_WORDING.slice(1).replace("letter of undertaking", "Letter of Undertaking")}.`;
