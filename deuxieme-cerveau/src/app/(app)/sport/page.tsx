import { EnTeteSection } from '@/components/nav/EnTete'

export const metadata = { title: "Sport" }

export default function Page() {
  return (
    <>
      <EnTeteSection titre={"Sport"} />
      <p className="px-5 py-6 text-13 text-secondaire">
        Écran construit en phase 5.
      </p>
    </>
  )
}
