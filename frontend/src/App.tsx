import { AppShell } from './components/layout/app-shell'
import { ContextMenuProvider } from './components/shared/context-menu'

export default function App() {
  return (
    <ContextMenuProvider>
      <AppShell />
    </ContextMenuProvider>
  )
}
