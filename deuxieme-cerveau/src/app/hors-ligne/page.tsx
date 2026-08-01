export const metadata = { title: 'Hors ligne' }

export default function PageHorsLigne() {
  return (
    <div className="min-h-ecran flex flex-col justify-center px-5">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-24">Hors ligne</h1>
        <p className="mt-2 text-13 text-secondaire">
          Vos données sont sur le serveur, pas sur l&apos;appareil. Dès que la
          connexion revient, tout réapparaît tel quel.
        </p>
      </div>
    </div>
  )
}
