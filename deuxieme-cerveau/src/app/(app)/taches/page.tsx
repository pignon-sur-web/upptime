import { EnTeteSection } from '@/components/nav/EnTete'

export const metadata = { title: "Tâches" }

export default function Page() {
  return (
    <>
      <EnTeteSection titre={"Tâches"} />
      <p className="px-5 py-6 text-13 text-secondaire">
        Écran construit en phase 3.
      </p>
    </>
  )
}
