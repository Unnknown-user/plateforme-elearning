// Page d'accueil provisoire. Elle deviendra la page d'accueil publique (vitrine légère) en fin de prototype.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">Plateforme e-learning</h1>
      <p className="max-w-md text-zinc-600">
        Prototype en construction : plateforme de formation en marque blanche pour les organismes de formation.
      </p>
    </main>
  );
}
