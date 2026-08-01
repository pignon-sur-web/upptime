import { EnTeteSection } from '@/components/nav/EnTete'

export const metadata = { title: "Projets" }

export default function Page() {
  return (
    <>
      <EnTeteSection titre={"Projets"} />
      <p className="px-5 py-6 text-13 text-secondaire">
        Écran construit en phase 3.
      </p>
    </>
  )
}
