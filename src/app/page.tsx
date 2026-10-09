import Link from "next/link";
import {
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  ListChecks,
  Palette,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

// Page d'accueil publique (vitrine légère). L'adresse de contact vient de NEXT_PUBLIC_CONTACT_EMAIL (voir .env.example).
// ⚠️ À REVOIR AVANT MISE EN VENTE : textes commerciaux, mentions légales, politique de confidentialité, hébergeur indiqué.
const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@exemple.fr";
const demoLink = `mailto:${contactEmail}?subject=${encodeURIComponent("Demande de démonstration")}`;

const FEATURES: { icon: LucideIcon; title: string; text: string; tone: string }[] = [
  {
    icon: Palette,
    title: "À l'image de votre organisme",
    text: "Votre nom, votre logo, vos couleurs : vos apprenants se connectent à un espace qui est le vôtre.",
    tone: "bg-violet-100 text-violet-700",
  },
  {
    icon: BookOpen,
    title: "Des parcours simples à construire",
    text: "Modules, textes, vidéos et PDF : créez, réorganisez et publiez en quelques clics, avec l'aperçu apprenant en direct.",
    tone: "bg-sky-100 text-sky-700",
  },
  {
    icon: ListChecks,
    title: "Des quiz qui évaluent vraiment",
    text: "Choix unique, choix multiple, vrai/faux : seuil de réussite, nombre de tentatives et correction paramétrables.",
    tone: "bg-amber-100 text-amber-700",
  },
  {
    icon: ShieldCheck,
    title: "Des traces prêtes pour l'audit",
    text: "Avancement, temps passé, résultats : exports CSV pour Excel et attestation de fin de formation en PDF.",
    tone: "bg-emerald-100 text-emerald-700",
  },
];

const TRACES = [
  "Progression et statut de chaque apprenant, parcours par parcours",
  "Temps de présence enregistré sur la plateforme",
  "Résultats aux quiz, tentative par tentative, avec la date et l'heure",
  "Attestation de fin de formation générée automatiquement",
  "Export CSV ouvert directement dans Excel",
  "Données de chaque organisme strictement séparées",
];

/** Aperçu décoratif de deux organismes : illustre la marque blanche (couleurs fixes, pas de données réelles). */
function BrandPreview({ name, color, items }: { name: string; color: string; items: string[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-md">
      <div className="flex">
        <div className="w-40 shrink-0 border-r border-zinc-100 p-3">
          <div className="mb-3 flex items-center gap-2">
            <span
              aria-hidden
              style={{ backgroundColor: color }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold text-white"
            >
              {name[0]}
            </span>
            <span className="text-xs font-semibold leading-tight text-zinc-900">{name}</span>
          </div>
          {items.map((item, i) => (
            <div
              key={item}
              style={i === 0 ? { backgroundColor: `color-mix(in srgb, ${color} 14%, white)` } : undefined}
              className={`relative mb-1 rounded-md px-2.5 py-1.5 text-xs ${i === 0 ? "font-semibold text-zinc-900" : "text-zinc-600"}`}
            >
              {i === 0 && <span aria-hidden style={{ backgroundColor: color }} className="absolute inset-y-1.5 left-0 w-0.5 rounded-full" />}
              {item}
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-2 bg-zinc-50 p-3">
          <div style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #4f46e5))` }} className="h-12 rounded-lg" />
          <div className="h-2 w-3/4 rounded-full bg-zinc-200" />
          <div className="h-2 w-1/2 rounded-full bg-zinc-200" />
          <div style={{ backgroundColor: color }} className="h-6 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 text-lg font-semibold">
          <GraduationCap className="h-7 w-7 text-blue-700" aria-hidden /> Plateforme e-learning
        </span>
        <Link href="/login" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50">
          Accéder à mon espace
        </Link>
      </header>

      <main>
        <section className="bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-600 px-6 py-20 text-white">
          <div className="mx-auto max-w-6xl">
            <p className="mb-4 inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
              Pour les organismes de formation et les entreprises
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Votre plateforme de formation, à votre image.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-blue-100">
              Créez vos parcours, évaluez vos apprenants et conservez les traces utiles à vos audits Qualiopi, sur une plateforme
              simple, aux couleurs de votre organisme.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={demoLink} className="rounded-lg bg-white px-6 py-3 font-medium text-blue-800 hover:bg-blue-50">
                Demander une démonstration
              </a>
              <Link href="/login" className="rounded-lg border border-white/50 px-6 py-3 font-medium hover:bg-white/10">
                Accéder à mon espace
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Tout ce qu&apos;il faut, rien de superflu</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text, tone }) => (
              <div key={title} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-zinc-50 px-6 py-16">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Une marque blanche, vraiment</h2>
              <p className="mt-3 leading-relaxed text-zinc-600">
                Chaque organisme dispose de son propre espace : son nom, son logo et ses couleurs s&apos;appliquent à toute
                l&apos;interface. Les données d&apos;un organisme ne sont jamais visibles par un autre.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-zinc-700">
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-700" aria-hidden /> Trois profils : administrateur, formateur, apprenant
                </li>
                <li className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-blue-700" aria-hidden /> Personnalisation en quelques secondes
                </li>
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <BrandPreview name="Institut Horizon" color="#1d4ed8" items={["Mes parcours", "Suivi", "Paramètres"]} />
              <BrandPreview name="Atelier Lumière" color="#b45309" items={["Mes parcours", "Suivi", "Paramètres"]} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Pensée pour faciliter vos audits Qualiopi</h2>
              <p className="mt-3 leading-relaxed text-zinc-600">
                Conçue par une professionnelle de la formation (ingénierie pédagogique, financements OPCO, démarche Qualiopi),
                la plateforme rassemble automatiquement les éléments de preuve que vous devez pouvoir présenter.
              </p>
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900">
                <Award className="h-8 w-8 shrink-0" aria-hidden />
                <p className="text-sm font-medium">L&apos;attestation de fin de formation est générée en un clic, au nom de votre organisme.</p>
              </div>
            </div>
            <ul className="space-y-3">
              {TRACES.map((trace) => (
                <li key={trace} className="flex items-start gap-3 rounded-lg border border-zinc-200 p-4 text-sm text-zinc-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                  {trace}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-zinc-900 px-6 py-16 text-center text-white">
          <h2 className="text-2xl font-semibold tracking-tight">Envie de la voir en action ?</h2>
          <p className="mx-auto mt-3 max-w-xl text-zinc-300">
            Une démonstration de 15 minutes suffit pour parcourir un parcours, un quiz, le suivi et l&apos;attestation.
          </p>
          <a href={demoLink} className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-medium text-zinc-900 hover:bg-zinc-100">
            Demander une démonstration
          </a>
        </section>
      </main>

      <footer className="px-6 py-6 text-center text-sm text-zinc-600">
        Prototype de démonstration : toutes les données présentées sont fictives.
      </footer>
    </div>
  );
}
