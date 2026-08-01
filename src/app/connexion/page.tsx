import { FormulaireConnexion } from './FormulaireConnexion'

export const metadata = { title: 'Connexion' }

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>
}) {
  const { suite } = await searchParams

  return (
    <div className="min-h-ecran flex flex-col justify-center px-5">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-24">Mon 2ᵉ Cerveau</h1>
        <p className="mt-2 text-13 text-secondaire">
          Cette application est personnelle. Un mot de passe suffit.
        </p>
        <FormulaireConnexion suite={suite ?? '/'} />
      </div>
    </div>
  )
}
