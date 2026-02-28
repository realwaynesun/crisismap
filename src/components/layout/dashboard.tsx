'use client'

import { Header } from './header'
import { Sidebar } from './sidebar'
import { CrisisMap } from '@/components/map/crisis-map'
import { PolymarketPanel } from '@/components/markets/polymarket-panel'

export function Dashboard() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <div className="w-full md:w-[35%] h-[50vh] md:h-auto overflow-hidden">
          <Sidebar />
        </div>
        <div className="flex-1 relative">
          <CrisisMap />
        </div>
      </div>

      <PolymarketPanel />
    </div>
  )
}
