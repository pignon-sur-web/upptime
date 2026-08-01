import { EnTeteSection } from '@/components/nav/EnTete'

export const metadata = { title: "Argent" }

export default function Page() {
  return (
    <>
      <EnTeteSection titre={"Argent"} />
      <p className="px-5 py-6 text-13 text-secondaire">
        Écran construit en phase 4.
      </p>
    </>
  )
}
