// O colar de contas do ciclo (spec §4): jade = feita, contorno = futura,
// a 5ª sempre com aro dourado — o checkpoint é promessa desde o dia 1.
export default function Colar({ feitas, total }: { feitas: number; total: number }) {
  return (
    <div className="progress-dots" aria-label={`${feitas} de ${total} sessões feitas`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="progress-dot" data-done={i < feitas} data-checkpoint={i === 4} />
      ))}
    </div>
  )
}
