import { Widget } from '@/components/ui/Widget'
import { MurDuMois } from '@/components/graphiques/MurDuMois'
import { Courbe } from '@/components/graphiques/Courbe'
import { scoresDepuis } from '@/lib/donnees/habitudes'
import { aujourdhui, moisLong } from '@/lib/date'

export async function MurDuMoisWidget() {
  // Assez de jours pour couvrir le mois courant depuis le 1er.
  const scores = await scoresDepuis(Number(aujourdhui().slice(8, 10)))

  // Un widget vide ne s'affiche pas : il ne dit pas « aucune donnée ».
  if (scores.every((s) => s.attendues === 0)) return null

  return (
    <Widget libelle={`Le mur — ${moisLong(aujourdhui())}`}>
      <MurDuMois scores={scores} />
    </Widget>
  )
}

export async function CourbeHabitudesWidget() {
  const scores = await scoresDepuis(30)

  if (scores.filter((s) => s.score !== null).length < 2) return null

  return (
    <Widget libelle="Habitudes — 30 jours">
      <Courbe scores={scores} />
    </Widget>
  )
}
