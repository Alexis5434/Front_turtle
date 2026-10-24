import { createFileRoute, Link } from '@tanstack/react-router'
import { GreetingCard } from '../features/greeting/components/greeting-card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <section aria-labelledby="home-title">
      <h1 id="home-title" className="text-2xl font-bold text-foreground">
        Welcome to the scaffold
      </h1>
      <p className="mt-2 text-muted-foreground">
        This minimal shell demonstrates routing, the layout, an error boundary, and the example
        component.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="w-full">
          <GreetingCard name="Developer" hour={9} />
        </div>
        <Button>Hola gobernador</Button>
        <Button asChild variant="secondary">
          <Link to="/kds">Abrir Pantalla KDS de Cocina</Link>
        </Button>
      </div>
    </section>
  )
}
