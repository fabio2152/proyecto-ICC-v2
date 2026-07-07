import AiKeyConfig from '../../components/ai/AiKeyConfig'

export default function AdminConfig() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">Ajustes de la plataforma</p>
      </div>
      <AiKeyConfig />
    </div>
  )
}
