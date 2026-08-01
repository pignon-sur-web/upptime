import { EnTeteSection } from '@/components/nav/EnTete'

export const metadata = { title: "Objectifs" }

export default function Page() {
  return (
    <>
      <EnTeteSection titre={"Objectifs"} />
      <p className="px-5 py-6 text-13 text-secondaire">
        Écran construit en phase 5.
      </p>
    </>
  )
}
