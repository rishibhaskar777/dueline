import type { ReminderLanguage, Tone } from "@/types";
import type { ReminderText } from "./check-reminder";
import { FINAL_AFTER_REMINDERS } from "./tone";

interface TemplateParts {
  number: string;
  owed: string;
  // The work description in brackets, or "" when there is none.
  work: string;
  due: string;
  greeting: string;
}

interface Pack {
  hello: (name: string | null) => string;
  days: (count: number) => string;
  gentle: (parts: TemplateParts, days: string) => ReminderText;
  firm: (parts: TemplateParts, days: string) => ReminderText;
  final: (parts: TemplateParts, days: string) => ReminderText;
}

const english: Pack = {
  hello: (name) => (name ? `Hi ${name} team,` : "Hi there,"),
  days: (count) => `${count} ${count === 1 ? "day" : "days"}`,
  gentle: (p, days) => ({
    subject: `A quick reminder about invoice ${p.number}`,
    message: `${p.greeting}

A quick reminder that invoice ${p.number} for ${p.owed}${p.work} was due on ${p.due} and is now ${days} overdue. If you have already paid, please ignore this note.

The PayPal email has a Pay now button that takes you straight to the payment. Please let me know if anything is unclear.`,
  }),
  firm: (p, days) => ({
    subject: `Invoice ${p.number} is now ${days} overdue`,
    message: `${p.greeting}

I am following up on invoice ${p.number} for ${p.owed}${p.work}. It was due on ${p.due} and is now ${days} overdue, and I have not yet seen a payment.

Could you please pay it this week using the Pay now button in the PayPal email? If something is holding it up, let me know and I will help sort it out.`,
  }),
  final: (p, days) => ({
    subject: `Final reminder: invoice ${p.number}`,
    message: `${p.greeting}

This is my final reminder about invoice ${p.number} for ${p.owed}${p.work}. It was due on ${p.due} and is now ${days} overdue.

Please pay it within the next 3 days using the Pay now button in the PayPal email, or reply with the date you expect to pay.`,
  }),
};

const german: Pack = {
  hello: (name) => (name ? `Hallo ${name},` : "Guten Tag,"),
  days: (count) => `${count} ${count === 1 ? "Tag" : "Tage"}`,
  gentle: (p, days) => ({
    subject: `Kurze Erinnerung zu Rechnung ${p.number}`,
    message: `${p.greeting}\n\nzur Erinnerung: Rechnung ${p.number} über ${p.owed}${p.work} war am ${p.due} fällig und ist nun seit ${days} überfällig. Falls Sie bereits bezahlt haben, ignorieren Sie diese Nachricht bitte.\n\nIn der PayPal-E-Mail finden Sie die Schaltfläche „Pay now“, die Sie direkt zur Zahlung führt. Melden Sie sich gern, falls etwas unklar ist.`,
  }),
  firm: (p, days) => ({
    subject: `Rechnung ${p.number} ist seit ${days} überfällig`,
    message: `${p.greeting}\n\nich komme auf Rechnung ${p.number} über ${p.owed}${p.work} zurück. Sie war am ${p.due} fällig, ist seit ${days} überfällig und ich habe noch keine Zahlung gesehen.\n\nKönnten Sie sie bitte diese Woche über die Schaltfläche „Pay now“ in der PayPal-E-Mail bezahlen? Falls etwas die Zahlung aufhält, sagen Sie mir Bescheid, dann finden wir eine Lösung.`,
  }),
  final: (p, days) => ({
    subject: `Letzte Erinnerung: Rechnung ${p.number}`,
    message: `${p.greeting}\n\ndies ist meine letzte Erinnerung zu Rechnung ${p.number} über ${p.owed}${p.work}. Sie war am ${p.due} fällig und ist seit ${days} überfällig.\n\nBitte zahlen Sie innerhalb der nächsten 3 Tage über die Schaltfläche „Pay now“ in der PayPal-E-Mail, oder nennen Sie mir das Datum, an dem Sie zahlen werden.`,
  }),
};

const french: Pack = {
  hello: (name) => (name ? `Bonjour ${name},` : "Bonjour,"),
  days: (count) => `${count} ${count === 1 ? "jour" : "jours"}`,
  gentle: (p, days) => ({
    subject: `Petit rappel concernant la facture ${p.number}`,
    message: `${p.greeting}\n\nPetit rappel : la facture ${p.number} d'un montant de ${p.owed}${p.work} était due le ${p.due} et accuse désormais ${days} de retard. Si vous avez déjà payé, veuillez ignorer ce message.\n\nL'e-mail PayPal contient un bouton « Pay now » qui vous mène directement au paiement. N'hésitez pas à me dire si quelque chose n'est pas clair.`,
  }),
  firm: (p, days) => ({
    subject: `Facture ${p.number} en retard de ${days}`,
    message: `${p.greeting}\n\nJe reviens vers vous au sujet de la facture ${p.number} d'un montant de ${p.owed}${p.work}. Elle était due le ${p.due}, elle a ${days} de retard et je n'ai pas encore reçu de paiement.\n\nPourriez-vous la régler cette semaine avec le bouton « Pay now » de l'e-mail PayPal ? Si quelque chose vous bloque, dites-le-moi et nous trouverons une solution.`,
  }),
  final: (p, days) => ({
    subject: `Dernier rappel : facture ${p.number}`,
    message: `${p.greeting}\n\nCeci est mon dernier rappel concernant la facture ${p.number} d'un montant de ${p.owed}${p.work}. Elle était due le ${p.due} et a ${days} de retard.\n\nMerci de la régler dans les 3 jours avec le bouton « Pay now » de l'e-mail PayPal, ou de m'indiquer la date de paiement prévue.`,
  }),
};

const spanish: Pack = {
  hello: (name) => (name ? `Hola ${name},` : "Hola,"),
  days: (count) => `${count} ${count === 1 ? "día" : "días"}`,
  gentle: (p, days) => ({
    subject: `Un breve recordatorio sobre la factura ${p.number}`,
    message: `${p.greeting}\n\nUn breve recordatorio: la factura ${p.number} por ${p.owed}${p.work} vencía el ${p.due} y lleva ${days} de retraso. Si ya la ha pagado, ignore este mensaje.\n\nEl correo de PayPal incluye un botón «Pay now» que lleva directamente al pago. Avíseme si algo no queda claro.`,
  }),
  firm: (p, days) => ({
    subject: `La factura ${p.number} lleva ${days} de retraso`,
    message: `${p.greeting}\n\nLe escribo de nuevo sobre la factura ${p.number} por ${p.owed}${p.work}. Vencía el ${p.due}, lleva ${days} de retraso y todavía no he recibido el pago.\n\n¿Podría pagarla esta semana con el botón «Pay now» del correo de PayPal? Si algo lo impide, avíseme y lo resolveremos.`,
  }),
  final: (p, days) => ({
    subject: `Último recordatorio: factura ${p.number}`,
    message: `${p.greeting}\n\nEste es mi último recordatorio sobre la factura ${p.number} por ${p.owed}${p.work}. Vencía el ${p.due} y lleva ${days} de retraso.\n\nPor favor, págela en los próximos 3 días con el botón «Pay now» del correo de PayPal, o indíqueme la fecha en que prevé pagar.`,
  }),
};

const dutch: Pack = {
  hello: (name) => (name ? `Beste ${name},` : "Beste,"),
  days: (count) => `${count} ${count === 1 ? "dag" : "dagen"}`,
  gentle: (p, days) => ({
    subject: `Een korte herinnering over factuur ${p.number}`,
    message: `${p.greeting}\n\nEen korte herinnering: factuur ${p.number} van ${p.owed}${p.work} moest op ${p.due} betaald zijn en is nu ${days} te laat. Als u al betaald hebt, kunt u dit bericht negeren.\n\nIn de PayPal-e-mail staat een knop "Pay now" die u rechtstreeks naar de betaling brengt. Laat het me weten als iets onduidelijk is.`,
  }),
  firm: (p, days) => ({
    subject: `Factuur ${p.number} is ${days} te laat`,
    message: `${p.greeting}\n\nIk kom terug op factuur ${p.number} van ${p.owed}${p.work}. Die moest op ${p.due} betaald zijn, is nu ${days} te laat en ik heb nog geen betaling gezien.\n\nKunt u de factuur deze week betalen met de knop "Pay now" in de PayPal-e-mail? Als iets de betaling tegenhoudt, laat het me weten, dan zoeken we een oplossing.`,
  }),
  final: (p, days) => ({
    subject: `Laatste herinnering: factuur ${p.number}`,
    message: `${p.greeting}\n\nDit is mijn laatste herinnering over factuur ${p.number} van ${p.owed}${p.work}. Die moest op ${p.due} betaald zijn en is nu ${days} te laat.\n\nBetaal de factuur binnen 3 dagen met de knop "Pay now" in de PayPal-e-mail, of laat me weten op welke datum u verwacht te betalen.`,
  }),
};

const portuguese: Pack = {
  hello: (name) => (name ? `Olá ${name},` : "Olá,"),
  days: (count) => `${count} ${count === 1 ? "dia" : "dias"}`,
  gentle: (p, days) => ({
    subject: `Um breve lembrete sobre a fatura ${p.number}`,
    message: `${p.greeting}\n\nUm breve lembrete: a fatura ${p.number} no valor de ${p.owed}${p.work} venceu em ${p.due} e está com ${days} de atraso. Se já efetuou o pagamento, desconsidere esta mensagem.\n\nO e-mail do PayPal tem um botão "Pay now" que leva direto ao pagamento. Avise-me se algo não estiver claro.`,
  }),
  firm: (p, days) => ({
    subject: `A fatura ${p.number} está com ${days} de atraso`,
    message: `${p.greeting}\n\nVolto a escrever sobre a fatura ${p.number} no valor de ${p.owed}${p.work}. Ela venceu em ${p.due}, está com ${days} de atraso e ainda não vi o pagamento.\n\nPoderia pagá-la esta semana com o botão "Pay now" do e-mail do PayPal? Se algo estiver impedindo, avise-me e resolvemos juntos.`,
  }),
  final: (p, days) => ({
    subject: `Último lembrete: fatura ${p.number}`,
    message: `${p.greeting}\n\nEste é o meu último lembrete sobre a fatura ${p.number} no valor de ${p.owed}${p.work}. Ela venceu em ${p.due} e está com ${days} de atraso.\n\nPor favor, pague-a nos próximos 3 dias com o botão "Pay now" do e-mail do PayPal ou diga-me em que data pretende pagar.`,
  }),
};

const hindi: Pack = {
  hello: (name) => (name ? `नमस्ते ${name},` : "नमस्ते,"),
  days: (count) => `${count} दिन`,
  gentle: (p, days) => ({
    subject: `इनवॉइस ${p.number} के बारे में एक छोटा अनुस्मारक`,
    message: `${p.greeting}\n\nएक छोटा अनुस्मारक: ${p.owed}${p.work} का इनवॉइस ${p.number} ${p.due} को देय था और अब ${days} से बकाया है। यदि आप पहले ही भुगतान कर चुके हैं, तो कृपया इस संदेश को अनदेखा करें।\n\nPayPal के ईमेल में "Pay now" बटन है, जो सीधे भुगतान पर ले जाता है। कुछ स्पष्ट न हो तो मुझे बताइए।`,
  }),
  firm: (p, days) => ({
    subject: `इनवॉइस ${p.number} ${days} से बकाया है`,
    message: `${p.greeting}\n\n${p.owed}${p.work} के इनवॉइस ${p.number} के संबंध में यह फॉलो-अप है। यह ${p.due} को देय था, अब ${days} से बकाया है और अभी तक भुगतान नहीं मिला है।\n\nकृपया इसे इसी सप्ताह PayPal ईमेल के "Pay now" बटन से चुका दें। यदि कोई बाधा है तो बताइए, हम उसे सुलझा लेंगे।`,
  }),
  final: (p, days) => ({
    subject: `अंतिम अनुस्मारक: इनवॉइस ${p.number}`,
    message: `${p.greeting}\n\n${p.owed}${p.work} के इनवॉइस ${p.number} के बारे में यह मेरा अंतिम अनुस्मारक है। यह ${p.due} को देय था और अब ${days} से बकाया है।\n\nकृपया इसे अगले 3 दिनों में PayPal ईमेल के "Pay now" बटन से चुका दें, या बताइए कि आप किस तारीख तक भुगतान करेंगे।`,
  }),
};

// The final tone also applies to an invoice more than 30 days late that was never chased. Such a message
// asks for payment within 3 days but does not call itself the final or last reminder; only the packs
// above do, and only when two reminders have really been sent.
type Notice = (p: TemplateParts, days: string) => ReminderText;

const NOTICES: Record<ReminderLanguage, Notice> = {
  en: (p, days) => ({
    subject: `Invoice ${p.number} is ${days} overdue: payment needed`,
    message: `${p.greeting}

Invoice ${p.number} for ${p.owed}${p.work} was due on ${p.due} and is now ${days} overdue. I have not yet received a payment or a date for one.

Please pay it within the next 3 days using the Pay now button in the PayPal email, or reply with the date you expect to pay.`,
  }),
  de: (p, days) => ({
    subject: `Rechnung ${p.number}: Zahlung erforderlich (seit ${days} überfällig)`,
    message: `${p.greeting}\n\nRechnung ${p.number} über ${p.owed}${p.work} war am ${p.due} fällig und ist seit ${days} überfällig. Eine Zahlung oder einen Zahlungstermin habe ich noch nicht erhalten.\n\nBitte zahlen Sie innerhalb der nächsten 3 Tage über die Schaltfläche „Pay now“ in der PayPal-E-Mail, oder nennen Sie mir das Datum, an dem Sie zahlen werden.`,
  }),
  fr: (p, days) => ({
    subject: `Facture ${p.number} : paiement nécessaire (${days} de retard)`,
    message: `${p.greeting}\n\nLa facture ${p.number} d'un montant de ${p.owed}${p.work} était due le ${p.due} et a ${days} de retard. Je n'ai reçu ni paiement ni date de paiement.\n\nMerci de la régler dans les 3 jours avec le bouton « Pay now » de l'e-mail PayPal, ou de m'indiquer la date de paiement prévue.`,
  }),
  es: (p, days) => ({
    subject: `Factura ${p.number}: se necesita el pago (${days} de retraso)`,
    message: `${p.greeting}\n\nLa factura ${p.number} por ${p.owed}${p.work} vencía el ${p.due} y lleva ${days} de retraso. Todavía no he recibido el pago ni una fecha de pago.\n\nPor favor, págela en los próximos 3 días con el botón «Pay now» del correo de PayPal, o indíqueme la fecha en que prevé pagar.`,
  }),
  nl: (p, days) => ({
    subject: `Factuur ${p.number}: betaling nodig (${days} te laat)`,
    message: `${p.greeting}\n\nFactuur ${p.number} van ${p.owed}${p.work} moest op ${p.due} betaald zijn en is nu ${days} te laat. Ik heb nog geen betaling of betaaldatum van u ontvangen.\n\nBetaal de factuur binnen 3 dagen met de knop "Pay now" in de PayPal-e-mail, of laat me weten op welke datum u verwacht te betalen.`,
  }),
  pt: (p, days) => ({
    subject: `Fatura ${p.number}: pagamento necessário (${days} de atraso)`,
    message: `${p.greeting}\n\nA fatura ${p.number} no valor de ${p.owed}${p.work} venceu em ${p.due} e está com ${days} de atraso. Ainda não recebi o pagamento nem uma data de pagamento.\n\nPor favor, pague-a nos próximos 3 dias com o botão "Pay now" do e-mail do PayPal ou diga-me em que data pretende pagar.`,
  }),
  hi: (p, days) => ({
    subject: `इनवॉइस ${p.number}: भुगतान आवश्यक (${days} से बकाया)`,
    message: `${p.greeting}\n\n${p.owed}${p.work} का इनवॉइस ${p.number} ${p.due} को देय था और अब ${days} से बकाया है। अभी तक न भुगतान मिला है और न ही भुगतान की तारीख।\n\nकृपया इसे अगले 3 दिनों में PayPal ईमेल के "Pay now" बटन से चुका दें, या बताइए कि आप किस तारीख तक भुगतान करेंगे।`,
  }),
};

const PACKS: Record<ReminderLanguage, Pack> = {
  en: english,
  de: german,
  fr: french,
  es: spanish,
  nl: dutch,
  pt: portuguese,
  hi: hindi,
};

interface PackFacts {
  number: string;
  owed: string;
  work: string | null;
  due: string;
  daysLate: number;
  name: string | null;
  // Reminders already sent for the invoice.
  remindersSent: number;
}

export function packTemplate(
  language: ReminderLanguage,
  tone: Tone,
  facts: PackFacts,
): ReminderText {
  const pack = PACKS[language];
  const parts: TemplateParts = {
    number: facts.number,
    owed: facts.owed,
    work: facts.work ? ` (${facts.work})` : "",
    due: facts.due,
    greeting: pack.hello(facts.name),
  };
  const days = pack.days(facts.daysLate);
  if (tone === "final" && facts.remindersSent < FINAL_AFTER_REMINDERS) {
    return NOTICES[language](parts, days);
  }
  return pack[tone](parts, days);
}
