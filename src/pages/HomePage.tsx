import { useAppStore } from '../store/useAppStore'
import Button from '../components/ui/Button'

export default function HomePage() {
  const { count, increment, decrement, reset } = useAppStore()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold tracking-tight">Swell</h1>
      <p className="text-lg text-gray-500">Count: {count}</p>
      <div className="flex gap-3">
        <Button onClick={decrement}>-</Button>
        <Button variant="secondary" onClick={reset}>
          Reset
        </Button>
        <Button onClick={increment}>+</Button>
      </div>
    </main>
  )
}
