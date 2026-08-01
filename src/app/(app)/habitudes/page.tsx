import { EnTeteSection } from '@/components/nav/EnTete'

export const metadata = { title: "Habitudes" }

export default function Page() {
  return (
    <>
      <EnTeteSection titre={"Habitudes"} />
      <p className="px-5 py-6 text-13 text-secondaire">
        Écran construit en phase 2.
      </p>
    </>
  )
}
